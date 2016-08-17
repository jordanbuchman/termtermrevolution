var blessed = require('blessed');
var contrib = require('blessed-contrib');
var player = require('play-sound')(opts = {});

function closest(arr, target) {
  return Math.max.apply(Math, arr.filter(function(x) {
    return x <= target;
  }));
}

function isASCII(str) {
  return /^[\x00-\x7F]*$/.test(str);
}

String.prototype.substring_wrap = function(begin, end) {
  return this.substring(begin, end) + this.substring(0, end - this.length);
};

var play = function(data_file, audio_file, video_file, image_bg_file) {

  var song = require(data_file);

  var notes = song.notes[0].notes;

  var title = isASCII(song.title) ? song.title : song.titleTranslit;

  var artist = song.artist;

  // Create a screen object.
  var screen = blessed.screen({
    smartCSR: true
  });

  var grid = new contrib.grid({
    rows: 12,
    cols: 25,
    screen: screen
  });
  screen.title = 'Term Term Revolution!';

  var left = grid.set(1, 0, 1, 1, blessed.box, {
    content: "◀",
    align: "center"
  });
  left.setFront();
  var down = grid.set(1, 8, 1, 1, blessed.box, {
    content: "▼",
    align: "center"
  });
  down.setFront();
  var up = grid.set(1, 16, 1, 1, blessed.box, {
    content: "▲",
    align: "center"
  });
  up.setFront();
  var right = grid.set(1, 24, 1, 1, blessed.box, {
    content: "▶",
    align: "center"
  });
  right.setFront();


  var leftcol = [];
  for (var i = 0; i < 12; i++) {
    leftcol.push(grid.set(i, 0, 1, 1, blessed.box, {
      content: "◀",
      align: "center"
    }));
  }
  leftcol.forEach(function(x) {
    x.hide();
  });

  var downcol = [];
  for (var i = 0; i < 12; i++) {
    downcol.push(grid.set(i, 8, 1, 1, blessed.box, {
      content: "▼",
      align: "center"
    }));
  }
  downcol.forEach(function(x) {
    x.hide();
  });

  var upcol = [];
  for (var i = 0; i < 12; i++) {
    upcol.push(grid.set(i, 16, 1, 1, blessed.box, {
      content: "▲",
      align: "center"
    }));
  }
  upcol.forEach(function(x) {
    x.hide();
  });

  var rightcol = [];
  for (var i = 0; i < 12; i++) {
    rightcol.push(grid.set(i, 24, 1, 1, blessed.box, {
      content: "▶",
      align: "center"
    }));
  }
  rightcol.forEach(function(x) {
    x.hide();
  });


  left.style.bold = 'true';
  up.style.bold = 'true';
  right.style.bold = 'true';
  down.style.bold = 'true';

  left.style.bold = 'true';
  up.style.bold = 'true';
  right.style.bold = 'true';
  down.style.bold = 'true';


  function bigTextTicker(text, numchars, speed) {
    var bigbox = grid.set(8, 9, 4, 7, blessed.bigtext, {
      content: text.substring(0, numchars),
      shrink: true,
      border: 'line',
      fch: ' ',
      ch: '\u2592',
      style: {
        fg: 'red',
        bg: 'blue',
        bold: false
      }
    });

    var begin = 0;
    var end = numchars;

    setInterval(function() {
      begin = (begin + 1) % text.length;
      end = begin + numchars;
      bigbox.setContent(text.substring_wrap(begin, end));
      screen.render();
    }, speed);
  }

  bigTextTicker("TERM TERM REVOLUTION! Song: " + title + ' By: ' + artist + ' ', 6, 200);



  screen.key(['left', 'up', 'right', 'down'], function(ch, key) {
    switch (key.name) {
      case 'left':
        left.style.bg = 'green';
        setTimeout(function() {
          resetKey(left);
        }, 200);
        break;
      case 'up':
        up.style.bg = 'green';
        setTimeout(function() {
          resetKey(up);
        }, 200);
        break;
      case 'right':
        right.style.bg = 'green';
        setTimeout(function() {
          resetKey(right);
        }, 200);
        break;
      case 'down':
        setTimeout(function() {
          resetKey(down);
        }, 200);
        down.style.bg = 'green';
        break;
      default:
        break;
    }
    screen.render();
  });

  function resetKey(key) {
    key.style.bg = undefined;
    screen.render();
  }


  screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0);
  });

  function addNote(direction, speed) {
    var rownum = 11;
    switch (direction) {
      case 'left':
        var col = leftcol;
        var dir = left;
        var char = '◀';
        break;
      case 'up':
        var col = upcol;
        var dir = up;
        var char = '▲';
        break;
      case 'right':
        var col = rightcol;
        var dir = right;
        var char = '▶';
        break;
      case 'down':
        var col = downcol;
        var dir = down;
        var char = '▼';
        break;
      default:
        return;
    }
    var timer = setInterval(function() {
      try {
        col[rownum + 1].hide();
        col[rownum].show();
        screen.render();
      } catch ( err ) {
        screen.render();
      }
      if ((rownum == -1 || rownum === 0 || rownum == 1) && dir.style.bg == 'green') {
        dir.setContent(char + "\n Good");
        try {
          col[rownum].hide();
        } catch ( err ) {}

        //setTimeout(function(){dir.setContent(char)},500);
        clearInterval(timer);
        return;
      } else if (rownum == -1) {
        dir.setContent(char + "\n Miss");
        //setTimeout(function(){dir.setContent(char)},500);
        clearInterval(timer);
      }
      rownum--;
    }, speed);
    col[rownum].show();
  }

  var directions = ['left', 'up', 'right', 'down'];

  var bpm_array = song.bpms;
  var bpm_changes = [];
  var bpms = {};
  bpm_array.forEach(function(bpm) {
    bpms[bpm[0]] = bpm[1]; bpm_changes.push(bpm[0]);
  });

  notes.forEach(function(note) {
    var steps = note.steps.split('');
    var realsteps = [];
    for (var i = 0; i < 4; i++) {
      if (steps[i] == '1') {
        realsteps.push(directions[i]);
      }
    }
    setTimeout(function() {
      realsteps.forEach(function(step) {
        addNote(
          step,
          1000 / (bpms[closest(bpm_changes, note.measure * 4)] / 60)
        );
      });
    }, note.offset);
  });

  player.play(audio_file, function(err) {});

  if (video_file) {
    var video = blessed.video({
      parent: screen,
      left: 0,
      top: 0,
      file: video_file,
      width: 'shrink',
      height: 'shrink'
    });
    video.setBack();
  }

  var background = blessed.ansiimage({
    parent: screen,
    file: image_bg_file,
    height: '100%',
    top: 'center',
    left: 'center'
  });
  background.setBack();


  // Render the screen.
  screen.render();
}

exports.play = play;
