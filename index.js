
// javascript
//const input = 'let obj = {a: 1};';
const options = process.argv;
const input = options[2];

//pikascript
// let obj = pika.object('a', 1);

/**
 * 词法分析器：获取当前字符串处理成tokens
 *
 * @param {*} input
 */
function tokenizer(input) {
  const NUMBER = /[0-9]/;
  const LETTER = /[a-z]/i;
  const WHITESPACE = /\s/;
  let cur = 0;
  const tokens = [];
  while(cur < input.length){
    let char = input[cur];
    //👇下面开始我们的检验过程！依照上面我们给出的demo，我们只识别大括号，声明关键字，变量名，数字，等号,冒号,分号 这几种
    
    if(WHITESPACE.test(char)){
      cur++;
      continue;
    }
    //小括号
    if(char === '{') {
      tokens.push({
        type: 'brace',
        value: '{'
      });
      cur++;
      continue;
    }
    if(char === '}'){
      tokens.push({
        type: 'brace',
        value: '}'
      });
      cur++;
      continue;
    }

    //等号 
    if(char === '='){
      tokens.push({
        type: 'equals',
        value: '='
      });
      cur++;
      continue;
    }

    //冒号 
    if(char === ':'){
      tokens.push({
        type: 'colon',
        value: ':'
      });
      cur++;
      continue;
    }

    //分号
    if(char === ';'){
      tokens.push({
        type: 'sep',
        value: ';'
      });
      cur++;
      continue;
    }
    
    //数字
    if(NUMBER.test(char)){
      let res = '';
      while(NUMBER.test(char)){
        res+=char;
        char = input[++cur];
      }
      tokens.push({
        type: 'number',
        value: res
      });
      continue;
    }

    //字母
    if(LETTER.test(char)){
      let res = '';
      while(LETTER.test(char)){
        res+=char;
        char = input[++cur];
      }
      tokens.push({
        type: 'letter',
        value: res
      });
      continue;
    }

    throw new Error('Unexpected ' + char);
  }
  return tokens;
}

function parser(tokens) {
  const ast = {};
  let curidx = -1;
  let curToken = tokens[curidx];

  function visitNode() {
    curToken = tokens[++curidx];
    if(!curToken){
      return ;
    }
    //处理声明语句
    if((curToken.value === 'var' || curToken.value === 'let' || curToken.value === 'const') && curToken.type === 'letter'){
      return {
        type: 'VariableDeclaration',
        kind: curToken.value,
        declarations: [{
          type: 'VariableDeclarator',
          id: visitNode(),
          init: visitNode()
        }]
      }
    }
    // 处理等号，分号，冒号，右大括号。其实就是不处理，直接继续，返回下一个的处理值
    if((curToken.value === '=' && curToken.type === 'equals') || curToken.type === 'colon' || curToken.type === 'sep' || (curToken.type === 'brace'&&curToken.value==="}")){
      return visitNode();
    }
    //处理大括号
    if(curToken.value === '{' && curToken.type === 'brace') {
      return {
        type: 'ObjectExpression',
        properties: {
          type: 'Property',
          key: visitNode(),
          value: visitNode()
        }
      };
    }
    //处理其他不是特殊字符的标识符
    if(curToken.type === 'letter'){
      return {
        type: 'Identifier',
        name: curToken.value
      }
    }
    //处理数字
    if(curToken.type === 'number'){
      return {
        type: 'Literal',
        value: curToken.value
      }
    }
    throw new TypeError(curToken.type);
  }
  return visitNode();  
}

// 遍历器，访问者模式。深度优先遍历。babel的各种plugin其实就是在这个过程，提供了enter exit两个钩子，有点切面编程的意思
function traverser(ast, visitor) {
  function visitArray(arr, father) {
    arr.forEach(ele => {
      visitNode(ele, father);
    });
  }
  function visitNode(node, father){
    let f = visitor[node.type];
    if(f){//如果有对应的方法
      f(node, father);
    }
    //这里处理一种数组情况
    if(node.type === 'VariableDeclaration'){
      visitArray(node.declarations, node);
      return;
    }
    //
    if(node.type === 'VariableDeclarator'){
      visitNode(node.id, node);
      visitNode(node.init, node);
      return;
    }
    if(node.type === 'ObjectExpression'){
      visitNode(node.properties, node);
      return;
    }
    if(node.type === 'Property' ){
      visitNode(node.key, node);
      visitNode(node.value, node);
      return;
    }
    if(node.type === 'Identifier' || node.type === 'Literal' ){
      return;
    }
    throw new TypeError(node.type);
  }
  visitNode(ast, null);
}


// 转换器，调用遍历器，生成新的ast结构。这里没在新的ast里操作，是in-place原地替换的方式
//这里不建议拴在_context上，但是图简单就这样做了。可以建立一个映射表，告诉子成员修改父成员的哪个属性
// 这个例子也只涉及到修改父节点的一侧节点，如果是多个子节点都要修改，需要在深度遍历的过程中持续更新_context的值
function transformer(ast) {
  // const newAst = {};
  traverser(ast, {
    VariableDeclarator: function(node, father) {
      node._context = 'init';
    },
    ObjectExpression: function(node, father){
      father[father._context] = {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: {
            type: 'Identifier',
            name: 'pika'
          },
          property: {
            type: 'Identifier',
            name: 'object'
          }
        },
        arguments: []
      };
      node._context = father[father._context].arguments;
    },
    Property: function(node, father){
      father._context.push({
        type: 'Literal',
        value: node.key.name
      },{
        type: 'Literal',
        value: node.value.value
      });
    }
  });
  return ast;
}


//代码生成器，递归打印节点字符串
function generator(node) {
  if(node.type === 'VariableDeclaration'){
    return `${node.kind} ${generator(node.declarations[0].id)} = ${generator(node.declarations[0].init)}`;
  }
  if(node.type === 'Identifier'){
    return node.name;
  }
  if(node.type === 'Literal'){
    return node.value;
  }
  if(node.type === 'CallExpression'){
    let arguStr = '';
    for(let i=0;i<node.arguments.length;i++){
      arguStr+=`\'${generator(node.arguments[i])}\'${i>=node.arguments.length-1 ? '' : ','}`;
    }
    return `${generator(node.callee)}(${arguStr})`
  }
  if(node.type === 'MemberExpression'){
    return `${generator(node.object)}.${generator(node.property)}`;
  }
}

console.log(generator(transformer(parser(tokenizer(input)))));