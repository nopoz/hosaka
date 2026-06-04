#!/usr/bin/env bash

# usage: <script> <container name> <image name> <current version> <update version> <watcher name> <compose project name>

portainer_url="$PORTAINER_API_ENDPOINT"
api_key="$PORTAINER_API_KEY"
container_name="$1"
image_name="$2"
current_version="$3"
update_version="$4"
watcher_name="$5"
compose_project="$6"

# Configurable timeouts and intervals
update_timeout="${UPDATE_TIMEOUT:-300}"  # Overall timeout for update operations (default 300s)
poll_interval="${POLL_INTERVAL:-5}"      # Interval for polling container state (default 5s)

# Inspect the container once; echo its state vs the target:
# ready | unhealthy | sameimage (target tag but image ID unchanged) | waiting | absent
check_container_state() {
	local endpoint_id="$1"
	local container_name="$2"
	local expected_image="$3"
	local initial_img_id="$4"

	local containers_json container_id container_info
	containers_json=$(curl -s --location --request GET "$portainer_url/endpoints/$endpoint_id/docker/containers/json?all=true" \
		--header 'Accept: application/json' \
		--header "X-API-Key: $api_key")
	container_id=$(echo "$containers_json" | jq -r --arg container_name "$container_name" \
		'.[] | select(.Names[] == "/\($container_name)") | .Id' | head -1)

	if [[ -z "$container_id" ]]; then
		echo "absent"
		return
	fi

	container_info=$(curl -s --location --request GET "$portainer_url/endpoints/$endpoint_id/docker/containers/$container_id/json" \
		--header 'Accept: application/json' \
		--header "X-API-Key: $api_key")

	local running_image_name container_state current_image_id health_status
	running_image_name=$(echo "$container_info" | jq -r '.Config.Image' | awk -F '/' '{print $NF}')
	container_state=$(echo "$container_info" | jq -r '.State.Status')
	current_image_id=$(echo "$container_info" | jq -r '.Image')
	health_status=$(echo "$container_info" | jq -r '.State.Health.Status // "none"')

	if [[ "$running_image_name" == "$expected_image" && "$container_state" == "running" ]]; then
		case "$health_status" in
			unhealthy) echo "unhealthy" ;;
			starting)  echo "waiting" ;;
			*)
				if [[ -n "$initial_img_id" && "$current_image_id" == "$initial_img_id" ]]; then
					echo "sameimage"
				else
					echo "ready"
				fi
				;;
		esac
		return
	fi
	echo "waiting"
}

# Wait for the container to reach the target image, driven by a live Docker
# event stream for rich/real-time progress, with a periodic inspect poll as a
# safety backstop (events can be missed/dropped, so we never rely on them
# alone). Returns 0 on success, 1 on failure/timeout.
wait_for_container_update() {
	local endpoint_id="$1"
	local container_name="$2"
	local expected_image="$3"
	local timeout="$4"
	local initial_img_id="$5"

	local start_time=$(date +%s)
	local since=$start_time
	local poll_backstop=10          # seconds between safety inspects when events are quiet
	local last_poll=$start_time
	local stream_dead=0

	echo -e "\nUpdate initiated - waiting for \"$container_name\" to reach image \"$expected_image\" (timeout ${timeout}s)"
	echo "Streaming live Docker events (inspect backstop every ${poll_backstop}s)..."

	local filters
	filters=$(printf '{"container":["%s"]}' "$container_name" | jq -sRr @uri)

	# verify_and_finish: inspect once; print result and return 0/1 if terminal,
	# otherwise return 2 to keep waiting. Used on candidate events and backstop.
	verify_and_finish() {
		local st
		st=$(check_container_state "$endpoint_id" "$container_name" "$expected_image" "$initial_img_id")
		case "$st" in
			ready)
				echo "  [$(date +%T)] Container running target image and healthy: $expected_image"
				return 0 ;;
			sameimage)
				echo "  [$(date +%T)] WARNING: running target tag but image ID unchanged - may have already been at target"
				return 0 ;;
			unhealthy)
				echo "  [$(date +%T)] ERROR: container running but health check is unhealthy"
				return 1 ;;
			*)
				return 2 ;;
		esac
	}

	while true; do
		local now elapsed
		now=$(date +%s)
		elapsed=$((now - start_time))

		if [[ $elapsed -ge $timeout ]]; then
			echo -e "\nERROR: Timeout waiting for container update after ${timeout}s"
			return 1
		fi

		if [[ $stream_dead -eq 0 ]]; then
			# Drain all currently-available events, acting on completion signals
			# as they arrive. read's timeout only bounds idle time before we fall
			# through to the backstop inspect.
			local line=""
			while IFS= read -r -t "$poll_interval" line; do
				# Parse the event; key off .Action (.status is often null).
				local action img
				action=$(echo "$line" | jq -r '.Action // .status // empty' 2>/dev/null)
				img=$(echo "$line" | jq -r '.Actor.Attributes.image // empty' 2>/dev/null)

				case "$action" in
					exec_*|"") : ;;  # ignore healthcheck exec noise / unparseable lines
					start|create|stop|kill|destroy|restart|die|oom|rename|health_status:*)
						echo "  • [$(date +%T)] $action${img:+ ($img)}"
						;;
				esac

				# Candidate completion signals -> verify against real state.
				if [[ "$action" == "start" || "$action" == "health_status: healthy" || "$action" == "health_status: unhealthy" ]]; then
					verify_and_finish; local rc=$?
					[[ $rc -ne 2 ]] && return $rc
				fi

				# Honour the overall timeout even during a busy event stream.
				if [[ $(( $(date +%s) - start_time )) -ge $timeout ]]; then
					echo -e "\nERROR: Timeout waiting for container update after ${timeout}s"
					return 1
				fi
			done
			# inner read failed: >128 = idle timeout (stream alive); else EOF.
			[[ $? -le 128 ]] && stream_dead=1
		else
			# Event stream ended; fall back to plain polling.
			sleep "$poll_interval"
		fi

		# Periodic inspect backstop (and immediately whenever the stream is dead).
		now=$(date +%s)
		if [[ $((now - last_poll)) -ge $poll_backstop || $stream_dead -eq 1 ]]; then
			last_poll=$now
			verify_and_finish; local rc=$?
			[[ $rc -ne 2 ]] && return $rc
		fi
	done < <(curl -sN --max-time "$timeout" --location --request GET \
		"$portainer_url/endpoints/$endpoint_id/docker/events?since=$since&filters=$filters" \
		--header 'Accept: application/json' \
		--header "X-API-Key: $api_key" 2>/dev/null)
}

# Demux Docker's multiplexed log stream (non-TTY containers prefix each frame
# with 8 binary bytes: [stream:1][000][payload-len:4 BE]). Without this the raw
# header bytes get printed into the console as garbage. Reads stdin, writes text.
demux_docker_stream() {
	od -An -v -tx1 | tr ' ' '\n' | awk '
		BEGIN { for(a=0;a<16;a++)for(b=0;b<16;b++){k=sprintf("%x%x",a,b);hx[k]=a*16+b} }
		/^[0-9a-fA-F][0-9a-fA-F]$/ { byte[n++]=tolower($0) }
		END {
			i=0
			while(i+8<=n){
				len=hx[byte[i+4]]*16777216+hx[byte[i+5]]*65536+hx[byte[i+6]]*256+hx[byte[i+7]]
				i+=8
				for(j=0;j<len && i<n;j++){ printf "%c", hx[byte[i]]; i++ }
			}
		}'
}

# Fetch the last N lines of a container's logs for failure diagnostics.
fetch_container_logs() {
	local endpoint_id="$1"
	local container_name="$2"
	local lines="${3:-50}"

	echo -e "\nFetching last $lines lines of logs for container \"$container_name\"..."

	local containers_json=$(curl -s --location --request GET "$portainer_url/endpoints/$endpoint_id/docker/containers/json?all=true" \
		--header 'Accept: application/json' \
		--header "X-API-Key: $api_key")

	local container_id=$(echo "$containers_json" | jq -r --arg container_name "$container_name" \
		'.[] | select(.Names[] == "/\($container_name)") | .Id')

	if [[ -z "$container_id" ]]; then
		echo "  Could not find container ID for \"$container_name\""
		return 1
	fi

	# Fetch logs via Docker API proxy, demuxing the stream so binary frame
	# headers don't end up in the console. Pipe directly (NULs survive).
	local logs=$(curl -s --location --request GET "$portainer_url/endpoints/$endpoint_id/docker/containers/$container_id/logs?stdout=true&stderr=true&tail=$lines" \
		--header "X-API-Key: $api_key" 2>/dev/null | demux_docker_stream | tail -n "$lines")

	if [[ -n "$logs" ]]; then
		echo -e "\nContainer logs:"
		echo "----------------------------------------"
		echo "$logs"
		echo "----------------------------------------"
	else
		echo "  No logs available or error fetching logs"
	fi
}

# ---------------------------------------------------------------------------
# Preflight validation: fail fast with an actionable message before doing work.
# ---------------------------------------------------------------------------
missing_env=()
[[ -z "$portainer_url" ]] && missing_env+=("PORTAINER_API_ENDPOINT")
[[ -z "$api_key" ]] && missing_env+=("PORTAINER_API_KEY")
if [[ ${#missing_env[@]} -gt 0 ]]; then
	echo "ERROR: required environment variable(s) not set: ${missing_env[*]}"
	echo "Set them on the Hosaka container. PORTAINER_API_ENDPOINT must include the /api"
	echo "suffix (e.g. https://portainer.example.com:9443/api); PORTAINER_API_KEY is a"
	echo "Portainer API access token."
	exit 1
fi

if [[ -z "$container_name" || -z "$image_name" || -z "$current_version" \
		|| -z "$update_version" || -z "$compose_project" ]]; then
	echo "ERROR: missing required argument(s)."
	echo "usage: $(basename "$0") <container name> <image name> <current version> <update version> <watcher name> <compose project>"
	echo "got:   name='$container_name' image='$image_name' current='$current_version' update='$update_version' watcher='$watcher_name' project='$compose_project'"
	echo "When run by Hosaka these are passed automatically; an empty value usually means the"
	echo "container is missing version or compose-project metadata Hosaka could not resolve."
	exit 1
fi

# Verify connectivity and auth up front so any failure is attributable to the
# right cause (unreachable endpoint vs bad key vs missing /api suffix).
preflight_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 --location \
	--request GET "$portainer_url/endpoints" \
	--header 'Accept: application/json' \
	--header "X-API-Key: $api_key")
preflight_rc=$?
if [[ $preflight_rc -ne 0 ]]; then
	echo "ERROR: could not reach Portainer at \"$portainer_url\" (curl exit $preflight_rc)."
	echo "Check PORTAINER_API_ENDPOINT (scheme, host, port) and that the Hosaka container can"
	echo "reach it on the network."
	exit 1
fi
case "$preflight_code" in
	2*) : ;;  # reachable and authorized
	401|403)
		echo "ERROR: Portainer rejected the API key (HTTP $preflight_code)."
		echo "Check PORTAINER_API_KEY - it must be a valid, non-expired Portainer API access token."
		exit 1 ;;
	404)
		echo "ERROR: Portainer returned HTTP 404 for \"$portainer_url/endpoints\"."
		echo "Check that PORTAINER_API_ENDPOINT includes the /api suffix (e.g. https://host:9443/api)."
		exit 1 ;;
	*)
		echo "ERROR: unexpected HTTP $preflight_code from \"$portainer_url/endpoints\"."
		echo "Verify PORTAINER_API_ENDPOINT and that the Portainer API is reachable and healthy."
		exit 1 ;;
esac

echo -e "\ncontainer name: $container_name"
echo "image name: $image_name"
echo "current version: $current_version"
echo "desired upgrade version: $update_version"
echo -e "compose project name: $compose_project"

echo -e "\nretrieving portainer info for container \"$container_name\" in stack \"$compose_project\"..."

# get container endpoint id
if [[ $watcher_name == "local" ]]; then
	endpoint_id=1
else
	endpoints_json=$(curl -s --location --request GET "$portainer_url/endpoints?name=$watcher_name" \
		--header 'Accept: application/json' \
		--header "X-API-KEY: $api_key")

	# Match the watcher name to an endpoint by checking each candidate against
	# the live Docker proxy (newer Portainer leaves the endpoint snapshot empty).
	candidate_ids=$(echo "$endpoints_json" | jq -r 'if type == "array" then .[] else . end | .Id')
	endpoint_id=""
	for candidate_id in $candidate_ids; do
		proxy_containers=$(curl -s --location --request GET "$portainer_url/endpoints/$candidate_id/docker/containers/json?all=true" \
			--header 'Accept: application/json' \
			--header "X-API-Key: $api_key")
		match=$(echo "$proxy_containers" | jq -r --arg container_name "$container_name" --arg compose_project "$compose_project" \
			'[.[] | select(.Names[] == "/\($container_name)" and .Labels["com.docker.compose.project"] == $compose_project)] | length' 2>/dev/null)
		if [[ "$match" -gt 0 ]] 2>/dev/null; then
			endpoint_id="$candidate_id"
			break
		fi
	done
fi

if [[ -z "$endpoint_id" || "$endpoint_id" == "null" ]]; then
	echo -e "\nERROR: could not determine the Portainer endpoint for watcher \"$watcher_name\"."
	echo "No endpoint matching \"$watcher_name\" has a container \"$container_name\" in project \"$compose_project\"."
	echo "Check that the Hosaka watcher name matches the Portainer environment (endpoint) name."
	exit 1
fi
echo "container endpoint id: $endpoint_id"

# get image id from endpoints output
filter_encoded=$(printf '{"name":["/%s"]}' "$container_name" | jq -sRr @uri)
endpoint_inspect=$(curl -s --location -g \
	--request GET "$portainer_url/endpoints/$endpoint_id/docker/containers/json?all=true&filters=$filter_encoded" \
	--header 'Accept: application/json' \
	--header "X-API-Key: $api_key")
image_id=$(echo "$endpoint_inspect" | jq '[.[] | .Portainer.ResourceControl.Id] | first')
if [[ -z "$image_id" || "$image_id" == "null" ]]; then
	echo -e "\nERROR: could not find Portainer stack ownership for container \"$container_name\" on endpoint $endpoint_id."
	echo "This updater only works on containers deployed as part of a Portainer stack."
	echo "If \"$container_name\" is a standalone container or was created outside Portainer, it"
	echo "cannot be updated this way."
	exit 1
fi
echo "container image id: $image_id"

# get stack id
filter_encoded=$(printf '{"EndpointID":%s}' "$endpoint_id" | jq -sRr @uri)
endpoint_stacks=$(curl -s --location -g \
	--request GET "$portainer_url/stacks?filters=${filter_encoded}" \
	--header 'Accept: application/json' \
	--header "X-API-Key: $api_key")
stack_id=$(echo "$endpoint_stacks" | jq --arg image_id "$image_id" '[.[] | select(.ResourceControl.Id == ($image_id|tonumber)) | .Id] | first')
if [[ -z "$stack_id" || "$stack_id" == "null" ]]; then
	echo -e "\nERROR: no Portainer stack found for container \"$container_name\" on endpoint $endpoint_id."
	echo "The container reports Portainer resource id $image_id but no matching stack was returned."
	echo "Confirm \"$compose_project\" is a Portainer-managed stack on this endpoint."
	exit 1
fi
echo "container stack id: $stack_id"

# get environment variables if present:
env_data=$(echo "$endpoint_stacks" | jq --arg id "$stack_id" '.[] | select(.Id == ($id | tonumber)) | .Env')

# get stack file contents:
stack_contents=$(curl -s --location --request GET "$portainer_url/stacks/$stack_id/file" \
	--header 'Accept: application/json' \
	--header "X-API-KEY: $api_key")
if [[ -n $stack_contents ]]; then
	echo "$compose_project stack file contents retrieved successfully from portainer API"
else
	echo -e "\nERROR: $compose_project stack file contents were not retrieved successfully."
	exit 1
fi

# check current stack data contains current version
literal_match=$(printf '%s' "$image_name:$current_version" | sed 's/[][()\.^$?*+|{}]/\\&/g')
if [[ ! $stack_contents =~ $literal_match ]]; then
	echo -e "\nERROR: could not find \"$image_name:$current_version\" in the $compose_project stack file."
	echo "The Portainer updater rewrites an explicit, pinned image tag and redeploys, so the"
	echo "stack must pin the exact current version of this image."

	stack_file_text=$(echo "$stack_contents" | jq -r '.StackFileContent // empty')
	image_lines=$(printf '%s\n' "$stack_file_text" | grep -F "$image_name:")

	if [[ $current_version == sha256:* || $current_version =~ ^[0-9a-f]{12,}$ ]]; then
		echo
		echo "Hosaka is watching this container by image DIGEST, which means its tag is a moving"
		echo "tag such as \"latest\". It passed a digest (\"$current_version\") instead of a version"
		echo "number, and this updater cannot rewrite a moving tag."
		echo "Fix: pin an explicit version in your stack (e.g. \"$image_name:1.2.3\" rather than"
		echo "\"$image_name:latest\"), redeploy the stack, then let Hosaka watch it for updates."
	elif printf '%s\n' "$image_lines" | grep -qE ":(latest|stable|edge|main|master|nightly|rolling|dev)([[:space:]\"']|\$)"; then
		echo
		echo "Your stack pins a moving tag for this image. This updater only works with explicit"
		echo "version tags. Replace the moving tag with a specific version (e.g. \"$image_name:1.2.3\")."
	fi

	if [[ -n $image_lines ]]; then
		echo
		echo "Lines in the $compose_project stack file that reference \"$image_name\":"
		printf '%s\n' "$image_lines" | sed 's/^/  /'
	else
		echo
		echo "No lines referencing \"$image_name\" were found in the stack file - check that the"
		echo "image name matches what is written in your compose file."
	fi
	exit 1
fi

# update stack data with desired upgrade version
echo -e "\nupdating $compose_project stack file data with upgrade version: $update_version"
stack_update=$(echo "$stack_contents" | jq -r \
	--arg image_name "$image_name" \
	--arg cur_ver "$current_version" \
	--arg up_ver "$update_version" \
	'.StackFileContent |= gsub(($image_name + ":" + $cur_ver); ($image_name + ":" + $up_ver)) | .StackFileContent'
)

# verify updated stack data contains new version
literal_match=$(printf '%s' "$image_name:$update_version" | sed 's/[][()\.^$?*+|{}]/\\&/g')
if [[ $stack_update =~ $literal_match ]]; then
	echo "successfully updated $compose_project stack data with $update_version"
else
	echo -e "\nERROR: $compose_project stack file was not successfully updated."
	echo -e "\nDEBUG: $compose_project stack file contents:\n$stack_update\n"
	exit 1
fi

# Capture initial container state before update
echo -e "\ncapturing initial container state..."
initial_containers_json=$(curl -s --location --request GET "$portainer_url/endpoints/$endpoint_id/docker/containers/json?all=true" \
	--header 'Accept: application/json' \
	--header "X-API-Key: $api_key")

initial_container_info=$(echo "$initial_containers_json" | jq -r --arg container_name "$container_name" \
	'.[] | select(.Names[] == "/\($container_name)")')

if [[ -n "$initial_container_info" ]]; then
	initial_image=$(echo "$initial_container_info" | jq -r '.Image')
	initial_image_name=$(echo "$initial_image" | awk -F '/' '{print $NF}')
	initial_image_id=$(echo "$initial_container_info" | jq -r '.ImageID')
	initial_state=$(echo "$initial_container_info" | jq -r '.State')
	echo "initial container image: $initial_image_name"
	echo "initial container state: $initial_state"
	echo "initial image ID: ${initial_image_id:0:19}..."
else
	echo "WARNING: Could not find container \"$container_name\" before update"
	initial_image_id=""
fi

# build the stack-update payload
env_data=${env_data:-"[]"}
payload=$(jq -n \
	--argjson env_data "$env_data" \
	--arg stack_file_content "$stack_update" \
	'{env: $env_data, prune: true, pullImage: false, stackFileContent: $stack_file_content}')

# push stack update to portainer API
echo -e "\npushing $compose_project stack file update to portainer..."
response=$(curl -s --max-time 300 -i --location \
	--request PUT "$portainer_url/stacks/$stack_id?endpointId=$endpoint_id" \
	--header 'Content-Type: application/json' \
	--header 'Accept: application/json' \
	--header "X-API-KEY: $api_key" \
	--data-raw "$payload")
result=$?

# confirm portainer API response
http_code=$(echo "$response" | awk 'NR==1 {print $2}')
if [[ $result -eq 0 ]] && [[ $http_code =~ 2[0-9]{2,} ]]; then
	echo -e "\nstack update successfully pushed to portainer (http $http_code)"
	echo "note: portainer is now processing the update asynchronously..."
else
	echo -e "\nERROR: failed to push update to portainer.\ncurl exit code: $result\nhttp response code: $http_code\n"
	# extract the json from the portainer response
	json_body=$(echo "$response" | tr -d '\r' | awk 'BEGIN{found=0} /^$/{found=1; next} found' | jq .)
	echo -e "\nDEBUG portainer response:\n$json_body\n"
	exit 1
fi

# Wait for container to update with progress monitoring
if ! wait_for_container_update "$endpoint_id" "$container_name" "$image_name:$update_version" "$update_timeout" "$initial_image_id"; then
	echo -e "\nERROR: Container did not update within timeout period"
	fetch_container_logs "$endpoint_id" "$container_name" 30
	exit 1
fi

# Echo how many containers are still running the old image.
check_old_container_present() {
	containers_json=$(curl -s --location --request GET "$portainer_url/endpoints/$endpoint_id/docker/containers/json?all=true" \
		--header 'Accept: application/json' \
		--header "X-API-Key: $api_key")
	echo "$containers_json" | jq --arg old_image "$old_image" \
		'[.[] | select(.Image | endswith($old_image))] | length'
}

# verify that the old container is no longer present
old_image="$image_name:$current_version"
echo -e "\nensuring the old container is no longer present..."

# loop until the old container is removed
old_container_wait_start=$(date +%s)
wait_count=0
while [[ "$(check_old_container_present)" -gt 0 ]]; do
	elapsed=$(($(date +%s) - old_container_wait_start))
	echo "old container with image \"$old_image\" still present, waiting for cleanup... (elapsed: ${elapsed}s)"
	sleep "$poll_interval"
	wait_count=$((wait_count + 1))
done

if [[ $wait_count -gt 0 ]]; then
	total_wait=$(($(date +%s) - old_container_wait_start))
	echo "old container removed after ${total_wait}s"
fi

echo "no containers are running with the old image version: $old_image"
echo -e "\nupdate verification completed successfully."
