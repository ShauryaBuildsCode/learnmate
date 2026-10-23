# Python Foundations: Loops and Lists

A short chapter for first-year students. Each section between the horizontal rules is one page.

---

## 1. Why we repeat things

Computers are good at doing the same thing many times without getting bored. If you had to print "Hello" five times, you could write five print lines, but what about five thousand? A **loop** lets you write the instruction once and tell Python how many times to repeat it. A **list** lets you keep many values together under one name so a loop can walk through them. This chapter covers both: loops first, then lists, then how they work together.

---

## 2. The for loop

A `for` loop repeats a block of code once for each item in a sequence.

```python
for i in range(3):
    print("Hello", i)
```

This prints `Hello 0`, `Hello 1`, `Hello 2`. The name `i` is the **loop variable**. Python sets `i` to the next value at the start of every repetition. The indented lines under the `for` line are the **loop body**; indentation is how Python knows which lines repeat.

---

## 3. Indentation matters

In Python the indentation (four spaces by convention) marks the body of a loop. A line that is not indented is outside the loop and runs only once, after the loop finishes.

```python
for i in range(2):
    print("inside", i)
print("outside")
```

The output is `inside 0`, `inside 1`, then `outside`. Forgetting to indent the body causes an `IndentationError`.

---

## 4. Meet range()

`range()` produces a sequence of whole numbers. It can take one, two or three arguments.

- `range(5)` gives 0, 1, 2, 3, 4
- `range(2, 6)` gives 2, 3, 4, 5
- `range(0, 10, 2)` gives 0, 2, 4, 6, 8 (the third number is the **step**)

Think of `range(start, stop, step)` as "start at start, keep going while below stop, jump by step".

---

## 5. Where does range() stop?

The `stop` value is **never included**. `range(5)` stops before 5, so the last number is 4. A helpful picture is a row of five fence posts numbered from 0: the posts are 0 to 4, and the number 5 is the first spot past the end of the fence. This is why `range(1, 5)` has only four numbers: 1, 2, 3, 4. If you want to include 5, write `range(1, 6)`.

---

## 6. Off-by-one errors

The most common loop bug is the **off-by-one error**: the loop runs one time too many or one time too few. It usually comes from forgetting that `range(n)` stops before `n`, and that counting starts at 0. When your answer is "almost right", check the first and last value of your loop variable. To add the numbers 1 to 5 you need `range(1, 6)`, not `range(1, 5)`.

---

## 7. Accumulating a total

A common pattern is to start a variable at zero and add to it each time around the loop. The variable is called an **accumulator**.

```python
total = 0
for i in range(1, 4):
    total = total + i
print(total)
```

Trace it: `total` starts at 0, then becomes 1, then 3, then 6. The final value, 6, is printed once after the loop ends.

---

## 8. The while loop

A `while` loop repeats as long as a condition stays true.

```python
n = 3
while n > 0:
    print(n)
    n = n - 1
```

This prints 3, 2, 1. Use `while` when you do not know in advance how many repetitions you need. You must change something inside the loop that eventually makes the condition false, otherwise you create an **infinite loop**.

---

## 9. Breaking out and skipping ahead

`break` leaves the loop immediately. `continue` skips the rest of the current repetition and jumps to the next one.

```python
for i in range(10):
    if i == 3:
        continue
    if i == 6:
        break
    print(i)
```

This prints 0, 1, 2, 4, 5. The value 3 is skipped and the loop ends at 6.

---

## 10. What is a list?

A **list** holds several values in order, written in square brackets and separated by commas.

```python
scores = [72, 85, 90]
```

Think of a list as a row of numbered lockers. Each locker holds one value, and the lockers are numbered from 0. Lists can hold numbers, text, or even other lists.

---

## 11. Indexing and slicing

Use the locker number, called the **index**, in square brackets to read one item: `scores[0]` is 72 and `scores[2]` is 90. Negative indexes count from the end, so `scores[-1]` is 90. A **slice** takes a part of the list: `scores[0:2]` gives `[72, 85]`. As with `range`, the stop index is not included. Asking for an index that does not exist, like `scores[3]`, raises an `IndexError`.

---

## 12. Changing a list

Lists can change after they are made. Assign to an index to replace an item: `scores[1] = 88`. Useful methods:

- `append(x)` adds `x` to the end
- `insert(i, x)` adds `x` at position `i`
- `remove(x)` deletes the first `x`
- `len(scores)` tells you how many items there are

Because lists can grow and shrink, `len()` is how you ask "how big is it right now?".

---

## 13. Looping over a list

You can loop straight over the items of a list without using indexes.

```python
names = ["Asha", "Ben", "Chi"]
for name in names:
    print("Hi", name)
```

Here the loop variable `name` takes each value in turn. If you also need the position, use `for i in range(len(names)):` and read `names[i]`.

---

## 14. Building a new list

A common pattern is to start with an empty list and `append` to it inside a loop.

```python
squares = []
for n in range(1, 4):
    squares.append(n * n)
```

After the loop, `squares` is `[1, 4, 9]`. You can also filter: only append when an `if` test is true, for example to keep only the even numbers.

---

## 15. Worksheet, part 1

**Exercise 1: Sum to n.** Write a function `sum_to(n)` that returns the sum of the whole numbers from 1 up to and including `n`. For example `sum_to(5)` is 15. Hint: this is the accumulator pattern from page 7, and remember where range() stops (page 5).

**Exercise 2: Countdown.** Write a function `countdown(n)` that uses a `while` loop and returns a list counting down from `n` to 1. For example `countdown(3)` returns `[3, 2, 1]`. See page 8.

---

## 16. Worksheet, part 2

**Exercise 3: Count the evens.** Write a function `count_evens(nums)` that returns how many numbers in the list `nums` are even. For example `count_evens([1, 2, 4, 7])` is 2. A number is even when `n % 2 == 0`. See pages 13 and 14.

**Exercise 4: Squares of the odds.** Write a function `odd_squares(nums)` that returns a new list holding the square of every odd number in `nums`, in the same order. For example `odd_squares([1, 2, 3])` returns `[1, 9]`. See page 14.
