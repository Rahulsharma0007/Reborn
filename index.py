import math
import os

def add(a,b):
    result=a+b
    return result

def calculate_area(radius):
    area = 3.14 * radius**2
    print("Area:",area)
    return area

def greet(name):
    message = "Hello, " + name
    print(message)
    return message

x = 10
y = 20
print(add(x,y))
calculate_area(5)
greet("Python")