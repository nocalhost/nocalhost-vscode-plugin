const fs = require('fs');

fs.access('/Users/zepengcai/.nh/vscode-plugin/.tmp/config.lock', (err) => {
    if (err) {
        console.log(err);
        return;
    }
    console.log('aaaa');
});