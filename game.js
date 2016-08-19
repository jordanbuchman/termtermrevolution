"use strict";

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

class Player {
  constructor(number, keys, notes, grid, screen, bpms, bpm_changes) {
    this.number = number;
    this.notes = notes;
    this.columns = {};
    this.directions = [];
    this.screen = screen;
    this.bpms = bpms;
    this.bpm_changes = bpm_changes;

    var that = this;

    for (var i = 0; i < keys.length; i++) {

      screen.debug(this.number);
      var key = keys[i];

      this.directions.push(key.name);

      var button = grid.set(1, i * 2 + (number - 1) * 16 + 1, 1, 1, blessed.box, {
        content: key.content,
        align: "center",
        style: {
          bold: true
        }
      });
      button.setFront();

      var col = [];
      for (var j = 0; j < 12; j++) {
        col.push(grid.set(j, i * 2 + (number - 1) * 16 + 1, 1, 1, blessed.box, {
          content: key.content,
          align: "center"
        }));
      }
      col.forEach(function(box) {
        box.hide();
      });

      this.columns[key.name] = {
        "button": button,
        "col": col,
        "content": key.content,
        "name": key.name
      }
    }

    screen.key(this.directions, function(ch, key) {
      that.columns[key.name]['button'].style.bg = 'green';
      setTimeout(function() {
        that.resetKey(that.columns[key.name]['button']);
      }, 200);
      screen.render();
    });

    var that = this;
    this.notes.forEach(function(note) {
      var steps = note.steps.split('');
      var realsteps = [];
      for (var i = 0; i < 4; i++) {
        if (steps[i] != '0') {
          realsteps.push(that.directions[i]);
        }
      }
      setTimeout(function() {
        realsteps.forEach(function(step) {
          that.addNote(
            step,
            1000 / (that.bpms[closest(that.bpm_changes, note.measure * 4)] / 60)
          );
        });
      }, note.offset);
    });
  }

  addNote(direction, speed) {
    var rownum = 11;

    var col = this.columns[direction]['col'];

    var dir = this.columns[direction]['button'];
    var char = this.columns[direction]['content'];

    var that = this;

    var timer = setInterval(function() {
      try {
        col[rownum + 1].hide();
        col[rownum].show();
        that.screen.render();
      } catch ( err ) {
        that.screen.render();
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

  resetKey(key) {
    key.style.bg = undefined;
    this.screen.render();
  }
}

function bigTextTicker(text, numchars, speed, screen) {
  var bigbox = blessed.bigtext({
    left: 'center',
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
  screen.append(bigbox);
  bigbox.abottom = '100%+' + bigbox.height;

  var begin = 0;
  var end = numchars;

  setInterval(function() {
    begin = (begin + 1) % text.length;
    end = begin + numchars;
    bigbox.setContent(text.substring_wrap(begin, end));
    screen.render();
  }, speed);
}


var play = function(data_file, audio_file, bg_file, mode) {

  var song = require(data_file);

  var notes_data = song.notes[mode];

  var notes = notes_data.notes;

  var title = isASCII(song.title) ? song.title : song.titleTranslit;

  var artist = song.artist;

  // Create a screen object.
  var screen = blessed.screen({
    smartCSR: true,
    debug: true
  });

  var grid = new contrib.grid({
    rows: 12,
    cols: 25,
    screen: screen
  });
  screen.title = 'Term Term Revolution!';


  bigTextTicker("TERM TERM REVOLUTION! Song: " + title + ' By: ' + artist + ' ', 6, 200, screen);


  screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0);
  });

  var bpm_array = song.bpms;
  var bpm_changes = [];
  var bpms = {};
  bpm_array.forEach(function(bpm) {
    bpms[bpm[0]] = bpm[1]; bpm_changes.push(bpm[0]);
  });

  player.play(audio_file, function(err) {});

  var p1 = new Player(1,
    [
      {
        name: "a",
        content: "A"
      },
      {
        name: "s",
        content: "S"
      },
      {
        name: "w",
        content: "W"
      },
      {
        name: "d",
        content: "D"
      }
    ],
    notes.map(function(note) {
      note.steps = note.steps.slice(0, 4); return note
    }),
    grid,
    screen,
    bpms,
    bpm_changes
  );

  if (notes_data.mode.indexOf('double') != -1) {
    var p2 = new Player(2,
      [
        {
          name: "left",
          content: "◀"
        },
        {
          name: "down",
          content: "▼"
        },
        {
          name: "up",
          content: "▲"
        },
        {
          name: "right",
          content: "▶"
        }
      ],
      notes.map(function(note) {
        note.steps = note.steps.slice(0, 4); return note
      }),
      grid,
      screen,
      bpms,
      bpm_changes
    );
  }

  if (bg_file.indexOf('.avi') != -1) {
    var bg = blessed.video({
      parent: screen,
      left: 'center',
      top: 'center',
      file: bg_file,
      width: '100%',
      height: '100%'
    });
  }
  else{
    var bg = blessed.ansiimage({
      parent: screen,
      left: 'center',
      top: 'center',
      file: bg_file,
      width: '100%',
      height: '100%',
      ascii: true
    });
  }
  bg.setBack();


  // Render the screen.
  screen.render();
}

exports.play = play;
