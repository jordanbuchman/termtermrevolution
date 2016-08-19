var blessed = require('blessed');
var fs = require('fs');
var path = require('path');
var player = require('play-sound')(opts = {});
var game = require('./game.js');
var AdmZip = require('adm-zip');
var child_process = require('child_process');
var sm_parser = require('sm-parser');

Array.prototype.diff = function(a) {
  return this.filter(function(i) {
    return a.indexOf(i) < 0;
  });
};

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

var screen = blessed.screen({
  smartCSR: true,
  debug: true
});


function getDirectories(srcpath) {
  return fs.readdirSync(srcpath).filter(function(file) {
    return fs.statSync(path.join(srcpath, file)).isDirectory();
  });
}


if (fs.readdirSync('./song_zips').length > 1) {
  fs.readdirSync('./song_zips').forEach(function(zip_file) {
    if (zip_file.indexOf(".zip") == -1) {
      return;
    }
    var zip = new AdmZip('./song_zips/' + zip_file);
    zip.extractAllTo(__dirname + '/songs/', /*overwrite*/ true);
    var zipEntries = zip.getEntries(); // an array of ZipEntry records
    var dir_name;
    zipEntries.forEach(function(zipEntry) {
      if (zipEntry.isDirectory) {
        dir_name = zipEntry.entryName.match(/([^\/]+)\/$/)[1] || zipEntry.entryName.substring(0, zipEntry.entryName.length - 1);
      } else {
        zip.extractEntryTo(zipEntry.entryName, './songs/' + dir_name, false, true);
      }
    });
    child_process.execSync('convert -colors 256 -depth 8 +dither png8:./songs/' + dir_name.replace(/ /g,'\\ ') + '/' + dir_name.replace(/ /g,'\\ ') + '.png png8:./songs/' + dir_name.replace(/ /g,'\\ ') + '/' + dir_name.replace(/ /g,'\\ ') + '.png');
    child_process.execSync('convert -colors 256 -depth 8 +dither png8:./songs/' + dir_name.replace(/ /g,'\\ ') + '/' + dir_name.replace(/ /g,'\\ ') + '-bg.png png8:./songs/' + dir_name.replace(/ /g,'\\ ') + '/' + dir_name.replace(/ /g,'\\ ') + '-bg.png');
    //child_process.execSync('node parser.js ' + __dirname + '/songs/' + dir_name + '/' + dir_name + '.sm');
    sm_parser.convert(__dirname + '/songs/' + dir_name + '/' + dir_name + '.sm');
    fs.unlink('./song_zips/' + zip_file, function(err) {});
  });
}

var songs = getDirectories('./songs');

var song_index = 0;

var music;
fs.stat(__dirname + '/songs/' + songs[song_index] + '/' + songs[song_index] + '.ogg', function(err) {
  if(err){
    music = player.play('./songs/' + songs[song_index] + '/' + songs[song_index] + '.mp3', function(err) {})
  }
  else{
    music = player.play('./songs/' + songs[song_index] + '/' + songs[song_index] + '.ogg', function(err) {})
  }
});

var image = blessed.ansiimage({
  parent: screen,
  file: './songs/' + songs[song_index] + '/' + songs[song_index] + '.png',
  height: '90%',
  top: 'center',
  left: 'center'
});
var image_left = blessed.ansiimage({
  parent: screen,
  file: './songs/' + songs[song_index - 1] + '/' + songs[song_index - 1] + '.png',
  height: '70%',
  top: 'center',
  left: '-57%'
});
var image_right = blessed.ansiimage({
  parent: screen,
  file: './songs/' + songs[song_index + 1] + '/' + songs[song_index + 1] + '.png',
  height: '70%',
  top: 'center',
  left: '95%'
});


screen.render();

screen.key(['left', 'right'], function(ch, key) {
  switch (key.name) {
    case 'left':
      song_index = Math.max(0, song_index - 1);
      break;
    case 'right':
      song_index = Math.min(songs.length - 1, song_index + 1);
      break;
    default:
      break;
  }
  music.kill();
  image.destroy();
  image_left.destroy();
  image_right.destroy();
  fs.stat(__dirname + '/songs/' + songs[song_index] + '/' + songs[song_index] + '.ogg', function(err) {
    if(err){
      music = player.play('./songs/' + songs[song_index] + '/' + songs[song_index] + '.mp3', function(err) {})
    }
    else{
      music = player.play('./songs/' + songs[song_index] + '/' + songs[song_index] + '.ogg', function(err) {})
    }
  });

  image = blessed.ansiimage({
    parent: screen,
    file: './songs/' + songs[song_index] + '/' + songs[song_index] + '.png',
    height: '90%',
    top: 'center',
    left: 'center'
  });
  image_left = blessed.ansiimage({
    parent: screen,
    file: './songs/' + songs[song_index - 1] + '/' + songs[song_index - 1] + '.png',
    height: '70%',
    top: 'center',
    left: '-57%'
  }); //Fix left offset here. Calculate by screen and image width?
  image_right = blessed.ansiimage({
    parent: screen,
    file: './songs/' + songs[song_index + 1] + '/' + songs[song_index + 1] + '.png',
    height: '70%',
    top: 'center',
    left: '95%'
  });

  screen.render();
});

screen.key(['enter'], function(ch, key) {
  var song = require('./songs/' + songs[song_index] + '/' + songs[song_index] + '.json');
  var modes = song.notes.map(function(x) {
    return x.mode
  }).filter(onlyUnique)
  var list = blessed.list({
    parent: screen,
    keys: true,
    left: 'center',
    top: 'center',
    height: '20%',
    align: 'center',
    width: '40%',
    bg: 'green',
    items: modes,
    interactive: true,
  });
  list.focus();
  screen.render();
  list.on('select', function(item, selected) {
    this.destroy();
    var difficulties = song.notes.filter(function(x) {
      return x.mode === modes[selected]
    }).map(function(x) {
      return x.difficulty
    });
    var list = blessed.list({
      parent: screen,
      keys: true,
      left: 'center',
      top: 'center',
      height: '20%',
      align: 'center',
      width: '40%',
      bg: 'green',
      items: difficulties,
      interactive: true,
    });
    list.focus();
    screen.render();
    list.on('select', function(item, selected2) {
      var chosen = song.notes.filter(function(x) {
        return x.mode === modes[selected] && x.difficulty === difficulties[selected2]
      })[0];
      start(song.notes.indexOf(chosen));
    })
  })

  function start(mode) {
    fs.stat(__dirname + '/songs/' + songs[song_index] + '/' + songs[song_index] + '.avi', function(err) {
      if (err) {
        fs.stat(__dirname + '/songs/' + songs[song_index] + '/' + songs[song_index] + '.ogg', function(err) {
          if(err){
            game.play(
              data_file = __dirname + '/songs/' + songs[song_index] + '/' + songs[song_index] + '.json',
              audio_file = __dirname + '/songs/' + songs[song_index] + '/' + songs[song_index] + '.mp3',
              bg_file = __dirname + '/songs/' + songs[song_index] + '/' + songs[song_index] + '-bg.png',
              mode = mode
            );
          }
          else {
            game.play(
              data_file = __dirname + '/songs/' + songs[song_index] + '/' + songs[song_index] + '.json',
              audio_file = __dirname + '/songs/' + songs[song_index] + '/' + songs[song_index] + '.ogg',
              bg_file = __dirname + '/songs/' + songs[song_index] + '/' + songs[song_index] + '-bg.png',
              mode = mode
            );
          }
        });
      } else {
          fs.stat(__dirname + '/songs/' + songs[song_index] + '/' + songs[song_index] + '.ogg', function(err) {
            if(err){
              game.play(
                data_file = __dirname + '/songs/' + songs[song_index] + '/' + songs[song_index] + '.json',
                audio_file = __dirname + '/songs/' + songs[song_index] + '/' + songs[song_index] + '.mp3',
                bg_file = __dirname + '/songs/' + songs[song_index] + '/' + songs[song_index] + '.avi',
                mode = mode
              );
            }
            else {
              game.play(
                data_file = __dirname + '/songs/' + songs[song_index] + '/' + songs[song_index] + '.json',
                audio_file = __dirname + '/songs/' + songs[song_index] + '/' + songs[song_index] + '.ogg',
                bg_file = __dirname + '/songs/' + songs[song_index] + '/' + songs[song_index] + '.avi',
                mode = mode
              );
            }
          });
      }
      image.destroy();
      image_left.destroy();
      image_right.destroy();
      music.kill();
      screen.destroy();
    });
  }
});

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});
