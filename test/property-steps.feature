Feature: setting and checking properties
    # We are testing cucumber steps here.
    # Steps prefixed with [TEST] are not under test themselves, but support the tests of others.

    Scenario Outline: Setting a property
        When I set property <property> to <type> <value>
        Then [TEST] I assert property <property> equals <result>

        Examples:
            | property     | type          | value         | result                     |
            | foo          | string        | word          | 'word'                     |
            | foo          | string        |               | ''                         |
            | foo          | number        | 4.3           | 4.3                        |
            | foo          | float         | 4.3           | 4.3                        |
            | foo          | int           | 4             | 4                          |
            | foo          | boolean       | true          | true                       |
            | foo          | bool          | true          | true                       |
            | foo          | object        | { "nr": 42 }  | { 'nr': 42 }               |
            | foo          | string-array  | one,two,three | ['one', 'two', 'three']    |
            | foo          | number-array  | 1,2,3         | [1, 2, 3]                  |
            | foo.chain    | string        | word          | 'word'                     |
            | foo.array[1] | string        | word          | 'word'                     |

    Scenario: Setting a property of a subproperty
        When I set property foo of bar to number 42
        Then [TEST] I assert property bar.foo equals 42

    Scenario Outline: Setting a property to null and undefined
        When I set property <property> to <value>
        Then [TEST] I assert property <property> equals <value>

        Examples:
            | property | value     |
            | foo      | null      |
            | foo      | undefined |

    Scenario: Setting a property to a template string
        When I set property end to string bar
        When I set property total to templateString foo{end}
        Then [TEST] I assert property total equals 'foobar'

    Scenario: Setting a property to the value of another property
        Given [TEST] I set bar to 42
        When I set property foo to property bar
        Then [TEST] I assert property foo equals 42

    Scenario Outline: Checking a property
        When [TEST] I set <property> to <actual value>
        Then I check property <property> equals <expected type> <expected value>

        Examples:
            | property     | actual value               | expected type | expected value |
            | foo          | 'word'                     | string        | word           |
            | foo          | ''                         | string        |                |
            | foo          | 4.3                        | number        | 4.3            |
            | foo          | 4.3                        | float         | 4.3            |
            | foo          | 4                          | int           | 4              |
            | foo          | true                       | boolean       | true           |
            | foo          | true                       | bool          | true           |
            | foo          | { 'nr': 42 }               | object        | { "nr": 42 }   |
            | foo          | ['one', 'two', 'three']    | string-array  | one,two,three  |
            | foo          | [1, 2, 3]                  | number-array  | 1,2,3          |

    Scenario: Checking a nested property
        When [TEST] I set foo to { list: [1, 2, 3] }
        Then I check property foo.list[1] equals number 2

    Scenario Outline: Checking a property equals null or undefined
        When [TEST] I set <property> to <value>
        Then I check property <property> equals <value>

        Examples:
            | property | value     |
            | foo      | null      |
            | foo      | undefined |

    Scenario: Checking a property using a template string
        Given [TEST] I set total to 'foobar'
        And [TEST] I set end to 'bar'
        Then I check property total equals templateString foo{end}

    @test
    Scenario Outline: Checking containers properties
        When [TEST] I set <property> to <actual value>
        Then I check property <property> contains an object with a property named <property name> of <expected type> <expected value>

        Examples:
            | property     | actual value                                                   | property name | expected type | expected value |
            | foo          | [{'name': 'fred', 'age': 12}, {'name': 'john', 'age': 32}]     | name          | string        | john           |
            | foo          | [{'name': 'fred', 'age': 12}, {'name': 'john', 'age': 32}]     | age           | number        | 12             |
            | foo          | [{'name': 'fred', 'alive': true}, {'name': 'john', 'age': 32}] | alive         | boolean       | true           |


    Scenario: Comparing if two attributes are equal
        When [TEST] I set bar to 42
        And [TEST] I set foo to 42
        Then I check property foo equals property bar

    Scenario: Loading testdata from file
        When I set property foo to testdata foo
        Then [TEST] I assert property foo.nr equals 42

    Scenario: Checking the type of a property.
        When [TEST] I set foo to 'bar'
        Then I check property foo has type string

    Scenario: Setting a property to a uuid
        When I set property foo to uuid()
        And I set property bar to uuid()
        Then [TEST] I assert properties foo and bar are not the same

    Scenario: Setting a date to now
        When I set property foo to date now
        Then [TEST] value of foo is date 0 days from now

    Scenario: Setting a relative date in the future
        When I set property foo to date 3 days from now
        Then [TEST] value of foo is date 3 days from now

    Scenario: Setting a relative date in the past
        When I set property foo to date 3 days ago
        Then [TEST] value of foo is date -3 days from now

    Scenario: Setting a date using an ISO string
        When I set property foo to dateISOString 1989-10-31T23:00:00.000Z
        Then [TEST] I assert property foo equals '1989-10-31T23:00:00.000Z'

    Scenario: Removing a property
        Given [TEST] I set foo to 42
        When I remove property foo
        Then [TEST] I assert property foo equals undefined

    Scenario: Comparing if two attributes are not equal
        When [TEST] I set bar to 43
        And [TEST] I set foo to 42
        Then I check property foo does not equals property bar

    Scenario: Checking if a property doesn't exist
        Given [TEST] I set foo to 42
        When I remove property foo
        Then I check property foo does not exist

    Scenario Outline: Checking a property has a certain format
        Given [TEST] I set foo to <property>
        When I check property foo has format <format>

        Examples:
            | property                               | format       |
            | 'test@foo.com'                         | email        |
            | 'test.com/foo'                         | url          |
            | 'test.com'                             | fqdn         |
            | '10.0.0.127'                           | ip           |
            | 'abcd'                                 | alpha        |
            | '1234'                                 | numeric      |
            | 'ab12'                                 | alphanumeric |
            | 'Zm9v'                                 | base64       |
            | '12ef'                                 | hexadecimal  |
            | '#1122FF'                              | hexcolor     |
            | 'abcd'                                 | lowercase    |
            | 'ABCD'                                 | uppercase    |
            | '42'                                   | int          |
            | '3.14'                                 | float        |
            | 'd8d683dc-194a-4203-b355-72970b161953' | uuid         |
            | '{ "foo": "bar" }'                     | json         |
            | '%foo;'                                | ascii        |

    Scenario Outline: Checking a property does not have a certain format
        Given [TEST] I set foo to <property>
        When I check property foo does not have format <format>

        Examples:
            | property                          | format       |
            | '@@not-an-email#'                 | email        |
            | '/foo'                            | url          |
            | 'test.com/foo'                    | fqdn         |
            | '10.0.0'                          | ip           |
            | 'abc5'                            | alpha        |
            | '123A'                            | numeric      |
            | 'ab1%'                            | alphanumeric |
            | 'oijaov'                          | base64       |
            | '12ep'                            | hexadecimal  |
            | '#11FF'                           | hexcolor     |
            | 'abCd'                            | lowercase    |
            | 'ABcD'                            | uppercase    |
            | '42.1'                            | int          |
            | 'abcd'                            | float        |
            | 'd8d683dc-4203-b355-72970b161953' | uuid         |
            | '"foo": "bar" }'                  | json         |
            | '§foo;'                           | ascii        |

    Scenario: Using a custom formatter
        Given [TEST] I set foo to 12
        When I check property foo has format even

    Scenario: Checking array members are same
        Given [TEST] I set actualArray to ['minosse', 'member', 42, 'comparison', 'test']
        And [TEST] I set expectedArray to ['comparison', 'test', 42, 'member', 'minosse']
        Then I check property actualArray only contains the members of property expectedArray

    Scenario: Checking array members are included
        Given [TEST] I set actualArray to ['git', 43, 'minosse', 42, 'member', 'foo', 'bar', 'comparison', 'test']
        And [TEST] I set expectedArray to ['comparison', 'test', 42, 'member', 'minosse']
        Then I check property actualArray contains the members of property expectedArray
