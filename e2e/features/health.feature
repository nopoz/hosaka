Feature: Healthcheck exposure
    Scenario: Hosaka must expose health endpoint
    When I GET /health
    Then response code should be 200
    And response body should be valid json
    And response body should contain uptime
