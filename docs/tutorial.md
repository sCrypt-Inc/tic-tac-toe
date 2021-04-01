# sCrypt Dapp 教程

在我们的[博客](https://blog.csdn.net/freedomhero)中，介绍了如何使用 sCrypt 来编写比特币智能合约。但是作为刚入门的开发者，你可能对如何使用 sCrypt 来构建 Dapp 更加感兴趣。接下来我们将教大家如何使用 sCrypt 一步一步地构建一个井字棋 Dapp.

该应用程序非常简单，它所做的就是使用两个玩家(分别是 Alice 和 Bob)的公钥哈希，初始化合约，各自下注相同的金额锁定到合约中，只有赢得那个人可以取走合约里面的钱，如果最后没有人赢，则两个玩家各自可以取走一半的钱。目标不仅是对应用程序进行编码，主要是学习如何对其进行编译，测试，部署和交互的过程。

## 搭建开发环境

1. 安装 sCrypt IDE，见 [sCrypt 开发工具篇 - Visual Studio Code 插件](https://blog.csdn.net/freedomhero/article/details/107127341)
1. 安装 nodejs, _version >= 12_

搭建开发环境非常简单方便，接下来我们用 [create-react-app](https://github.com/facebook/create-react-app) 来创建一个 react app， 执行 ` npx create-react-app tic-tac-toe`。然后用 vscode 打开我们刚刚创建的代码工程，并在根目录下创建一个`contracts` 目录，用来存放我们的合约代码，当然你也可以命名成其它名字。

## 使用 sCrypt 编写 tic-tac-toe 合约

我们将使用 sCrypt 编程语言来编写一个名为 TicTacToe 的合约，如果您还不了解 sCrypt 编程语言，可以查看我们的入门教程[高级语言 sCrypt 简介](https://blog.csdn.net/freedomhero/article/details/107104952), 下面是我们的合约代码：

```javascript

import "util.scrypt";

contract TicTacToe {
    PubKey alice;
    PubKey bob;

    static const int TURNLEN = 1;
    static const int BOARDLEN = 9;
    static const bytes EMPTY = b'00';
    static const bytes ALICE = b'01';
    static const bytes BOB = b'02';

    public function move(int n, Sig sig, int amount, SigHashPreimage txPreimage) {
        require(Tx.checkPreimage(txPreimage));
        require(n >= 0 && n < BOARDLEN);

        bytes scriptCode = Util.scriptCode(txPreimage);
        int scriptLen = len(scriptCode);

        int boardStart = scriptLen - BOARDLEN;
        // state: turn (1 byte) + board (9 bytes)
        int turn = unpack(scriptCode[boardStart - TURNLEN : boardStart]);
        bytes board = scriptCode[boardStart : ];

        // not filled
        require(Util.getElemAt(board, n) == EMPTY);

        bytes play = turn == 0 ? ALICE : BOB;
        PubKey player = turn == 0 ? this.alice : this.bob;

        // ensure it's player's turn
        require(checkSig(sig, player));
        // make the move
        board = Util.setElemAt(board, n, play);

        bytes outputs = b'';
        if (this.won(board, play)) {
            // winner takes all
            bytes outputScript = Util.pubKeyToP2PKH(player);
            bytes output = Util.buildOutput(outputScript, amount);
            outputs = output;
        }
        else if (this.full(board)) {
            // draw: equally split, i.e., both outputs have the same amount
            bytes aliceScript = Util.pubKeyToP2PKH(this.alice);
            bytes aliceOutput = Util.buildOutput(aliceScript, amount);

            bytes bobScript = Util.pubKeyToP2PKH(this.bob);
            bytes bobOutput = Util.buildOutput(bobScript, amount);

            outputs = aliceOutput + bobOutput;
        } else {
            // update state: next turn & next board
            bytes scriptCode_ = scriptCode[ : scriptLen - BOARDLEN - TURNLEN] + num2bin(1 - turn, TURNLEN) + board;
            bytes output = Util.buildOutput(scriptCode_, amount);
            outputs = output;
        }

        require(hash256(outputs) == Util.hashOutputs(txPreimage));
    }

    // does play win after current move?
    function won(bytes board, bytes play) : bool {
        // three in a row, a column, or a diagnoal
        int[8][3] lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6]
        ];

        bool anyLine = false;
        loop (8) : i {
            bool line = true;
            loop (3) : j {
                line = line && Util.getElemAt(board, lines[i][j]) == play;
            }

            anyLine = anyLine || line;
        }

        return anyLine;
    }

    // is board full?
    function full(bytes board) : bool {
        bool full = true;

        loop (BOARDLEN) : i {
            full = full && Util.getElemAt(board, i) != EMPTY;
        }

        return full;
    }
}

```

合约中使用的`util.scrypt` 是我们的常用工具库，可以在我们的[boilerplate](https://github.com/sCrypt-Inc/boilerplate) 工程中找到，这里只是把他简单的拷贝过来。该合约有两个成员变量，分别是 alice 和 bob 的 PubKey，在构造合约的时候需要初始化他们， 主要有两个作用：

1. 在合约中检查合约的调用者是否预期的玩家
1. 游戏结束时将合约的赌注转移到 PubKey 对应的地址

合约的状态(state)由两个变量组成：

1. `turn`: 轮流顺序, 0 表示轮到 Alice 下棋， 1 表示轮到 Bob 下棋, 长度为 1 byte
1. `board`: 棋盘，记录棋盘当前的状态，长度为 9 byte

合约中有 3 个函数：

1. `move` 是 唯一的 _public_ 函数，合约在区块链上的状态变化，是通过调用此函数触发的。
1. `won` 检查当前棋盘状态，有没有玩家已经赢得比赛，如果有人已经赢得比赛，那就将合约锁定的币转移到赢家对应的 PubKey 的地址
1. `full` 检查当前棋盘 9 个格子是否都走过了，如果已经都走过了，也没人赢，那相当于平局，则两两个人平分赌注

完成合约的编写后，我们可以右键编译合约，将会看到输出 `tictactoe_desc.json` 到`out`中， Dapp 将使用此文件来部署合约到区块链中，如下图：

![编译合约](./1.png)

## 测试合约

测试合约需要用到用于集成合约的`scryptlib`库以及测试框架`mocha`，执行以下命令来安装

`npm i scryptlib`

`npm i chai mocha --save-dev`

测试代码见 [tictactoe.scrypttest.js](../contracts/tictactoe.scrypttest.js)

至此，我们完成了合约代码的编写和测试。
