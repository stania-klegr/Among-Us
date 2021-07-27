var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

// var waiting = true;

var totalTasks = 0;
var tasksComplete = 0;
var tasksPerPlayer = 0;//SET TASKS PER PLAYER HERE
var numPlayers = 0;
var numImpostersAlive = 0;
var numPlayersAlive = 0;

var players = [];

var voteCounts = {};
var voteNames = {};
var voteCount = 0;

var fixCount = 0;
var sabotageEndPossible = false;


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/waitingRoom.html');
});

app.get('/kill.png', (req, res) => {
    res.sendFile(__dirname + '/kill.png');
});

app.get('/report.png', (req, res) => {
    res.sendFile(__dirname + '/report.png');
});

app.get('/sabotage.png', (req, res) => {
    res.sendFile(__dirname + '/sabotage.png');
});

app.get('/title.jpg', (req, res) => {
    res.sendFile(__dirname + '/title.jpg');
});

app.get('/use.png', (req, res) => {
    res.sendFile(__dirname + '/use.png');
});

app.get('/dead.png', (req, res) => {
    res.sendFile(__dirname + '/dead.png');
});

app.get('/button.png', (req, res) => {
    res.sendFile(__dirname + '/button.png');
});

app.get('/admin.html', (req, res) => {
    res.sendFile(__dirname + '/admin.html');
});

app.get('/button.html', (req, res) => {
    res.sendFile(__dirname + '/button.html');
});

app.get('/waitingRoom.html', (req, res) => {
    res.sendFile(__dirname + '/waitingRoom.html');
});

app.get('/game.html', (req, res) => {
    res.sendFile(__dirname + '/game.html');
});

app.get('/imposter.html', (req, res) => {
    res.sendFile(__dirname + '/imposter.html');
});

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('start game', (msg) => {
    console.log('start game request recived');
    console.log(msg);

    tasksPerPlayer = msg.numTasks;
    totalTasks = numPlayers * tasksPerPlayer;
    numPlayersAlive = numPlayers;

    for (var i = 0; i < msg.numImposters; i++) {
        console.log("looping");

        var x = Math.floor((Math.random() * numPlayers));

        if(players[x].imposter == true){
            x = (x + 1) %  numPlayers;
        }
        console.log("making an imposter: " + players[x].name + " " + x);

        players[x].imposter = true;
        numImpostersAlive++;//change one of the players to an imposter
        numPlayersAlive--;
        totalTasks = totalTasks - tasksPerPlayer;
    }

    console.log(players);
    io.emit('game starting', {players, tasksPerPlayer});
  });

  socket.on('reset game', (msg) => {
      console.log('reset game request recived');

      totalTasks = 0;
      tasksComplete = 0;
      tasksPerPlayer = 0;//SET TASKS PER PLAYER HERE
      numPlayers = 0;
      numImpostersAlive = 0;
      numPlayersAlive = 0;

      players = [];

      voteCounts = {};
      voteNames = {};
      voteCount = 0;

      sabotageEndPossible = false;

      io.emit('reset', true);
  });

  socket.on('task completed', (msg) => {
    console.log(msg + ' did a task');

    tasksComplete++;

    //add one to the tasks that the player has completed
    var arrayLength = players.length;
    for (var i = 0; i < arrayLength; i++) {
        // console.log(msg[i]);
        if(players[i].name == msg){

            players[i].tasksDoneByPlayer++;
        }
    }

    if(tasksComplete >= totalTasks){
        io.emit('game over', true);
    }

    io.emit('progress update', Math.floor((tasksComplete / totalTasks) * 100));
  });

  socket.on('i died', (msg) => {
    console.log(msg + ' died');
    numPlayersAlive--;
    if(numPlayersAlive <= numImpostersAlive){
        io.emit('game over', false);
    }

    //recalculate the total tasks
    var arrayLength = players.length;
    for (var i = 0; i < arrayLength; i++) {
        // console.log(msg[i]);
        if(players[i].name == msg){

            players[i].alive = false;

            tasksComplete = tasksComplete - players[i].tasksDoneByPlayer;
            totalTasks = totalTasks - tasksPerPlayer;

            io.emit('progress update', Math.floor((tasksComplete / totalTasks) * 100));

            break;//idk if break is gonna break anything...
        }
    }
  });

    socket.on('body reported', (msg) => {//potential issue if body is reported before it registers as dead..
        console.log(msg + ' reported a body');

        io.emit('do vote', {caller: msg, playerList: players});

        voteCounts = {};
        voteNames = {};
        voteCount = 0;

        //create the voteCounts table
        var arrayLength = players.length;
        for (var i = 0; i < arrayLength; i++) {
            // console.log(msg[i]);
            voteCounts[players[i].name] = 0;
        }

        voteCounts["skip"] = 0;
        console.log(voteCounts);
    });

    socket.on('break something', (msg) => {
        if(msg.thing){
            console.log(msg.name + ' sabotaged the reactor');
            io.emit('something broken', true); //true for reactor, false for o2
        }
        else{
            console.log(msg.name + ' sabotaged the O2');
            io.emit('something broken', false); //true for reactor, false for o2
        }
        sabotageEndPossible = true;
    });

    socket.on('i fixed something', (msg) => {
        console.log(msg + ' is fixing something');

        fixCount++;

        if(fixCount >= 2){
            fixCount = 0;
            io.emit('fixed', msg);
            console.log('fixed');
            sabotageEndPossible = false;
        }
    });

    socket.on('something go boom', (msg) => {

        if(sabotageEndPossible){
            if(msg){
                console.log('reactor go boom.');
            }
            else{
                console.log('ran out of O2');
            }

            fixCount = 0;
            io.emit('game over', false);
        }
    });

    socket.on('button pressed', (msg) => {//potential issue if body is reported before it registers as dead..
        console.log('SOMEONE PRESSED THE EMERGENCY BUTTON!!!');

        io.emit('do vote', {caller: msg, playerList: players});

        voteCounts = {};
        voteNames = {};
        voteCount = 0;

        //create the voteCounts table
        var arrayLength = players.length;
        for (var i = 0; i < arrayLength; i++) {
            // console.log(msg[i]);
            voteCounts[players[i].name] = 0;
        }

        voteCounts["skip"] = 0;
        console.log(voteCounts);
    });


    socket.on('get state after vote', (msg) => {
        console.log(msg + ' requested the game state');
        console.log(players);
        console.log(numPlayersAlive);
        console.log(numPlayersAlive);

        if(numImpostersAlive >= numPlayersAlive){
            io.emit('game over', false);
        }
        if(numImpostersAlive == 0){
            io.emit('game over', true);
        }
    });

    socket.on('vote', (msg) => {//potential issue if body is reported before it registers as dead..
        console.log(msg.vote + ' was voted for by ' + msg.name);

        voteNames[msg.vote] += "," + msg.name ;

        voteCounts[msg.vote]++;
        voteCount++;

        if(voteCount >= (numPlayersAlive + numImpostersAlive)){
            //voting complete
            console.log("voting complete");

            var mostVotesKey = "";
            var mostVotesMessage = "";
            var mostVotes = 0;
            var secondMostVotes = 0;

            for (var [key, value] of Object.entries(voteCounts)) {
                console.log(key, value);

                if(value >= mostVotes){
                    secondMostVotes = mostVotes;
                    mostVotes = value;
                    mostVotesKey = key;
                }
            }
            //if not a tie
            if(mostVotes != secondMostVotes){

                //if vote was skipped
                if(mostVotesKey == "skip"){
                    console.log("vote skipped, nobody dies");
                    mostVotesMessage = "vote skipped, nobody dies";
                }
                else{//else eliminate someone

                    var arrayLength = players.length;
                    for (var i = 0; i < arrayLength; i++) {
                        // console.log(msg[i]);
                        if(players[i].name == mostVotesKey){//if this is the player to eliminate

                            if(players[i].imposter){
                                numImpostersAlive--;
                                console.log(mostVotesKey + " got yeeted. They were an Imposter.");
                                mostVotesMessage = mostVotesKey + " got yeeted. They were an Imposter.";
                                players[i].alive = false;

                            }
                            else{
                                numPlayersAlive--;
                                console.log(mostVotesKey + " got yeeted. They were not an Imposter.");
                                mostVotesMessage = mostVotesKey + " got yeeted. They were not an Imposter.";

                                players[i].alive = false;
                                tasksComplete = tasksComplete - players[i].tasksDoneByPlayer;
                                totalTasks = totalTasks - tasksPerPlayer;

                                io.emit('progress update', Math.floor((tasksComplete / totalTasks) * 100));
                            }
                        }
                    }
                }
            }
            else{
                console.log("tie, nobody dies");
                mostVotesMessage = "tie, nobody dies";
            }
            io.emit('voting complete', {mostVotesKey, voteNames, mostVotesMessage});
        }
    });

  socket.on('add player', (msg) => {
    console.log(msg + ' joined the game');

    numPlayers++;

    var newPlayer = {
      name: msg,
      imposter: false,
      tasksDoneByPlayer: 0,
      alive: true
    };

    console.log(newPlayer);

    players.push(newPlayer);

    io.emit('player count update', {numPlayers: numPlayers, playerList: players});

  });
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});
