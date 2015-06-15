Feature: These tests are written to show you how Minosse is working

Scenario: Sending a get request should return "hello world"
     When I send a GET request to /
     Then DEBUG I print property response body
     Then the response status code is 200
     And I check property message of response body equals string hello world

Scenario Outline: Sending a get request to hello:name should return hello:name
     When I send a GET request to /hello/<name>
     Then the response status code is 200
     And I check property message of response body equals string hello <name>

     Examples:
     | name         |
     | Valerio      |
     | Jasper       |
     | Desmond      |

Scenario: Sending a post request to /hello with the name in the body should return name
    Given I set property name to testdata exampleName
    And I set property request body to property name
    Then DEBUG I print property request body
    When I send a POST request to /hello
    Then the response status code is 200
    And I check property name of response body equals string yourNameHere

Scenario: Sending a post request to /hello with the name in the body but using a uuid should return an uuid
    Given I set property uuid to uuid()
    And I set property name of request body to property uuid
    When I send a POST request to /hello
    Then the response status code is 200
    And I check property name of response body equals property uuid

Scenario: Sending a post request to /hello with the name in the body but changing the original value should return the updated value
    Given I set property name to testdata exampleName
    And I set property request body to property name
    And I set property updatedName to string my updated name
    And I set property name of request body to property updatedName
    When I send a POST request to /hello
    Then the response status code is 200
    And I check property name of response body equals string my updated name
    And I check property name of response body does not equals string yourNameHere

Scenario: Sending a post request to /hello/lastName using the same data as name but change it should return lastName
    Given I set property name to testdata exampleName
    And I set property request body to property name
    And I remove property name of request body
    And I set property updatedName to string lastName
    And I set property lastName of request body to property updatedName
    When I send a POST request to /hello/lastName
    Then the response status code is 200
    And I check property lastName of response body equals string lastName
    And I check property name of request body does not exist

