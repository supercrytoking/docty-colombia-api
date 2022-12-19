/*

Write a function to create a run length encoding format for a string

Given String AAAAAAAAAAAAABBCCCCDDE

Output : 9A4A2B4C2D1E

There is a catch  in this that we want this encoded string to be decoded as wellSo any count should be in a single digit only. If the continuous count is more than a single digit you need to break it down

*/


function encode(string) {
    let output = '';
    let prev = ''
    let count = 0
    for (let i = 0; i <= string.length; i++) {
        if (!!count && (count >= 9 || string[i] !== prev)) {
            output += `${count}${prev}`
            count = 0;
        }
        prev = string[i];
        count = count + 1;
    }
    return output
}

function decode(string) {
    let output = [];
    for (let i = 0; i <= string.length; i++) {
        if (!!Number(string[i])) {
            output = output.concat(Array(Number(string[i])).fill(string[i + 1]))
        }
    }
    return output.join('')
}

console.log(decode(encode('AAAAAAAABBCCCCDDE')) == 'AAAAAAAABBCCCCDDE');
console.log(decode(encode('AAAAAAMMMAAAAHHHHAAABBCCCCDDE')) == 'AAAAAAMMMAAAAHHHHAAABBCCCCDDE');
console.log(decode(encode('AAAAAAAAVVVAAAAABBCCCCDDE')) == 'AAAAAAAAVVVAAAAABBCCCCDDE');



function uniq(arr) {
    return arr.reduce((a, b) => {
        if (!a.includes(b)) a.push(b)
        return a
    }, []).sort((a, b) => a - b);
}

console.log(uniq([1, 23, 32, 34, 32, 23, 56, 44, 6, 7, 55, 34]))