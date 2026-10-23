# JavaScript Basics: Functions and Arrays

## Variables and values
In JavaScript you create a variable with let or const. Use const when the value will never be reassigned, and let when it will change. For example, const name = "Asha"; let score = 0; then score = score + 10. JavaScript has numbers, strings, booleans, null and undefined. Use console.log to print a value to the console.

## Functions
A function is a reusable block of code. You declare one with the function keyword: function add(a, b) { return a + b; }. Calling add(2, 3) returns 5. A function without a return statement returns undefined. Arrow functions are a shorter way to write functions: const double = (n) => n * 2; Arrow functions are very common when passing a function to another function.

## Arrays
An array holds an ordered list of values: const fruits = ["apple", "banana", "cherry"]. Indexes start at 0, so fruits[0] is "apple". The length property tells you how many items there are: fruits.length is 3. The push method adds an item to the end and pop removes the last item. fruits.push("mango") makes the array longer.

## Looping over arrays
A for loop visits each index: for (let i = 0; i < fruits.length; i++) { console.log(fruits[i]); }. The for...of loop is simpler: for (const fruit of fruits) { console.log(fruit); }. Use for...of when you do not need the index.

## map, filter and reduce
Arrays have powerful methods that take a function. The map method makes a new array by transforming each item: [1, 2, 3].map((n) => n * 2) gives [2, 4, 6]. The filter method keeps only items that pass a test: [1, 2, 3, 4].filter((n) => n % 2 === 0) gives [2, 4]. The reduce method combines all items into one value: [1, 2, 3].reduce((sum, n) => sum + n, 0) gives 6. These methods do not change the original array.

## Objects
An object stores named values: const student = { name: "Ravi", age: 17 }. Read a property with student.name. You can add one with student.grade = "A". An array of objects is a very common way to store records, and you can use map and filter on them too.

## Worksheet
Exercise 1: Write a function named double(n) that returns n multiplied by 2.
Exercise 2: Write a function named sumArray(nums) that returns the sum of all numbers in an array.
Exercise 3: Write a function named evens(nums) that returns a new array holding only the even numbers.
Exercise 4: Write a function named names(people) that takes an array of objects with a name property and returns an array of just the names.
