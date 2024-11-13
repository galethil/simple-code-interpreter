const babel = require("@babel/parser");

const code1 = 'return [2, 3, 1].find(a => aa === x);';

function executeCode(code, variables = {}) {
  function parseCode(code) {
    try {
        const functionToParse = `function f() { ${code} }`;
        return babel.parse(functionToParse, {
            sourceType: 'module',
            plugins: [],
        }
    );
   } catch (error) {
    console.log(error);
    return null;
   }
  }

  function traverse(node, contextVariables = {}) {
    console.log('node', node?.type, node?.loc?.start, node?.loc?.end);
    // handle empty nodes
    if (!node) {
        return;
    }
    if (node.type === 'File') {
        return traverse(node.program);
    }

    if (node.type === 'Program') {
      if (node.body.length !== 1) {
        throw new Error('Program must have exactly one statement');
      }
    
      // console.log('Program', node.body[0].body.body);
      return traverse(node.body);
    }

    if (node.type === 'FunctionDeclaration') {
        if (node.async || node.generator) {
            throw new Error('Async and generator functions are not supported');
        }
        if (node.id.name !== 'f') {
            throw new Error('Custom functions are not supported');
        }
        return traverse(node.body);
    }

    if (Array.isArray(node)) {
      let nodeFinalResult = null;
      for (const n of node) {
        const nodeResult = traverse(n);
        if (nodeResult?.type === 'return') {
          nodeFinalResult = nodeResult;
          break;
        }
      }
      return nodeFinalResult;
    }

    if (node.type === 'BlockStatement') {
      return traverse(node.body);
    }

    if (node.type === 'ReturnStatement') {
        return {
            type: 'return',
            value: traverse(node.argument).value,
        };
    }

    if (node.type === 'BinaryExpression') {
        
        const left = traverse(node.left, contextVariables);
        const right = traverse(node.right, contextVariables);
        
        if (node.operator === '+') {
            return {
                value: left.value + right.value
            }
        }
        if (node.operator === '-') {
            return {
                value: left.value - right.value
            }
        }
        if (node.operator === '*') {
            return {
                value: left.value * right.value
            }
        }
        if (node.operator === '/') {
            return {
                value: left.value / right.value
            }
        }
        if (node.operator === '>') {
            return {
                value: left.value > right.value
            }
        }
        if (node.operator === '<') {
            return {
                value: left.value < right.value
            }
        }
        if (node.operator === '>=') {
            return {
                value: left.value >= right.value
            }
        }
        if (node.operator === '<=') {
            return {
                value: left.value <= right.value
            }
        }
        if (node.operator === '==' || node.operator === '===') {
            return {
                value: left.value === right.value
            }
        }
        if (node.operator === '!=' || node.operator === '!==') {
            return {
                value: left.value !== right.value
            }
        }

        
    
        throw new Error(`Unsupported operator: ${node.operator}`);
    }

    if (node.type === 'LogicalExpression') {
        const left = traverse(node.left);
        const right = traverse(node.right);
        if (node.operator === '||') {
            return {
                value: left.value || right.value
            }
        }
        if (node.operator === '&&') {
            return {
                value: left.value && right.value
            }
        }
        throw new Error(`Unsupported operator: ${node.operator}`);
    }

    if (node.type === 'IfStatement') {
        const test = traverse(node.test);
        if (test.value) {
            return traverse(node.consequent);
        }
        return traverse(node.alternate);
    }

    if (node.type === 'ExpressionStatement') {
      return traverse(node.expression);
    }

    if (node.type === 'AssignmentExpression') {
      return {
        type: 'AssignmentExpression',
        left: traverse(node.left),
        right: traverse(node.right),
      };
    }

    if (node.type === 'CallExpression') {
        // Let's handle custom functions
        if (node.callee.type === 'Identifier' && node.callee.name === 'customFunction') {
            
        }

        // Let's handle built-in functions
        // Math functions
        if (node.callee.type === 'MemberExpression' && node.callee.object.name === 'Math') {
            if (node.callee.property.name === 'abs') {
                const arg = traverse(node.arguments[0]);
                return {
                    type: 'NumericLiteral',
                    value: Math.abs(arg.value),
                };
            }
            if (node.callee.property.name === 'floor') {
                const arg = traverse(node.arguments[0]);
                return {
                    type: 'NumericLiteral',
                    value: Math.floor(arg.value),
                };
            }
            if (node.callee.property.name === 'ceil') {
                const arg = traverse(node.arguments[0]);
                return {
                    type: 'NumericLiteral',
                    value: Math.ceil(arg.value),
                };
            }
            if (node.callee.property.name === 'round') {
                const arg = traverse(node.arguments[0]);
                return {
                    type: 'NumericLiteral',
                    value: Math.round(arg.value),
                };
            }
            throw new Error(`Unsupported Math function: ${node.callee.property.name}`);
        }

        // Array functions
        if (node.callee.type === 'MemberExpression' && node.callee.object.type === 'ArrayExpression') {
            if (node.callee.property.name === 'includes') {
                const array = traverse(node.callee.object);
                const arg = traverse(node.arguments[0]);
                return {
                    type: 'BooleanLiteral',
                    value: array.value.includes(arg.value),
                };
            }
            if (node.callee.property.name === 'map') {
                const array = traverse(node.callee.object);
                return {
                    type: 'ArrayExpression',
                    value: array.value.map((n) => {
                        const localVars = {};
                        // TODO add validation of params

                        if (node.arguments[0].params[0]) {
                            localVars[node.arguments[0].params[0].name] = n;
                        }
                        // console.log('arg.body', localVars, node.arguments[0].body);
                        return traverse(node.arguments[0].body, localVars).value;
                    })
                };
            }
            if (node.callee.property.name === 'find') {
                const array = traverse(node.callee.object);
                return {
                    value: array.value.find((n) => {
                        const localVars = {};
                        // TODO add validation of params

                        if (node.arguments[0].params[0]) {
                            localVars[node.arguments[0].params[0].name] = n;
                        }
                        console.log('arg.body', localVars, node.arguments[0].body);
                        return traverse(node.arguments[0].body, localVars).value;
                    })
                };
            }

            throw new Error(`Unsupported Array function: ${node.callee.property.name}`);
        }

        // console.log('CallExpression', node);
        throw new Error(`Unsupported Function called: ${node.loc.start} - ${node.loc.end}`);
    }

    if (node.type === 'ArrayExpression') {
        return {
            type: 'ArrayExpression',
            value: node.elements.map((n) => traverse(n).value),
        };
    }

    if (node.type === 'ArrowFunctionExpression') {
        if (node.async || node.generator) {
            throw new Error('Async and generator functions are not supported');
        }

        return traverse(node.body);
    }

    if (node.type === 'Identifier') {
      if (variables.hasOwnProperty(node.name)) {
        return {
            type: 'Identifier',
            name: node.name,
            value: variables[node.name],
          };
        
      }
      if (contextVariables.hasOwnProperty(node.name)) {
        return {
            type: 'Identifier',
            name: node.name,
            value: contextVariables[node.name],
          };
      }
      throw new Error(`Variable ${node.name} is not defined`);
    }

    if (node.type === 'NumericLiteral') {
      return {
        type: 'NumericLiteral',
        value: node.value,
      };
    }

    if (node.type === 'StringLiteral') {
      return {
        type: 'StringLiteral',
        value: node.value,
      };
    }

    if (node.type === 'BooleanLiteral') {
      return {
        type: 'BooleanLiteral',
        value: node.value,
      };
    }

    throw new Error(`Unsupported node type: ${node.type}`);
  }

  const parsed = parseCode(code);

  try {
    const result = traverse(parsed);
    return result;
  } catch (error) {
     console.log(error);
  }
}

const result = executeCode(code1, { x: 1, y: 2 });
console.log('Result', result);