# pikascript2javascript-compiler

作为一个 babel 的 over-simplified 版本
麻雀虽小五脏俱全，依然是要有作为编译器的三大功能模块：
parse  traverse  generate

不过这毕竟还只是一只麻雀，所以并不包含全部语法。我们只处理下面一种：

```javascript
// javascript
let obj = {a: 1};

//pikascript
let obj = pika.object('a', 1);
```
