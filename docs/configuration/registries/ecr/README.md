# ECR (Amazon Elastic Container Registry)
![logo](ecr.png)

The `ecr` registry lets you configure [ECR](https://aws.amazon.com/ecr/) integration.

### Variables

| Env var                            | Required     | Description                   | Supported values                                                                                  | Default value when missing |
| ---------------------------------- |:------------:| ----------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------- | 
| `HOSAKA_REGISTRY_ECR_REGION`          | :red_circle: | A valid AWS Region Code       | [AWS Region list](https://docs.aws.amazon.com/general/latest/gr/rande.html#regional-endpoints)    |                            |
| `HOSAKA_REGISTRY_ECR_ACCESSKEYID`     | :red_circle: | A valid AWS Access Key Id     | [Standard AWS Credentials](https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html) |                            |
| `HOSAKA_REGISTRY_ECR_SECRETACCESSKEY` | :red_circle: | A valid AWS Secret Access Key | [Standard AWS Credentials](https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html) |                            |

!> The AmazonEC2ContainerRegistryReadOnly Policy (or higher) must be attached to the AWS IAM User.

### Examples
<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
      - HOSAKA_REGISTRY_ECR_ACCESSKEYID=xxx
      - HOSAKA_REGISTRY_ECR_SECRETACCESSKEY=xxx
      - HOSAKA_REGISTRY_ECR_REGION=eu-west-1 
```
#### **Docker**
```bash
docker run \
  -e HOSAKA_REGISTRY_ECR_ACCESSKEYID="xxx" \
  -e HOSAKA_REGISTRY_ECR_SECRETACCESSKEY="xxx" \
  -e HOSAKA_REGISTRY_ECR_REGION="eu-west-1" \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

### How to create an AWS IAM user and get programmatic access

#### 1. Login to your&nbsp;[Go to the IAM Service from your AWS Console](https://console.aws.amazon.com/iam) and create a new user
![image](ecr_01.png)

#### 2. Attach the AmazonEC2ContainerRegistryReadOnly policy to the user
![image](ecr_02.png)

#### 3. Get your AccessKeyId and your Secret Access Key and configure Hosaka with them
![image](ecr_03.png)
