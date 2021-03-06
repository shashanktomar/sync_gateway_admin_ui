module.exports = function(grunt) {
  var watchChanged = {}
  if (grunt.file.exists('watchChanged.json')) {
    watchChanged = grunt.file.readJSON('watchChanged.json')
  }
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    babel : {
      // for jshint only
      options :  {
        only : "*.jsx"
      },
      dist : {
        "tmp/babel.js" : "src/jsx/*"
      }
    },
    jshint: {
      changed : [],
      js: ['Gruntfile.js', 'src/js/*.js', 'tests/*.js'],
      jsx : ['tmp/jsx/*.js'],
      options: {
        "browser": true,
        "globals": {
          "React" : true,
          "CodeMirror" : true,
          "confirm" : true
        },
        "node" : true,
        "asi" : true,
        "globalstrict": false,
        "quotmark": false,
        "smarttabs": true,
        "trailing": false,
        "undef": true,
        "unused": false
      }
    },
    node_tap: {
      all: {
          options: {
              outputType: 'failures', // tap, failures, stats
              outputTo: 'console' // or file
              // outputFilePath: '/tmp/out.log' // path for output file,
              // only makes sense with outputTo 'file'
          },
          files: {
              'tests': ['tests/*.js']
          }
      },
      changed: {
          options: {
              outputType: 'tap', // tap, failures, stats
              outputTo: 'console' // or file
              // outputFilePath: '/tmp/out.log' // path for output file,
              // only makes sense with outputTo 'file'
          },
          files: {
              'tests': watchChanged.node_tap || []
          }
      }
    },
    copy: {
      assets: {
        files: [
          // includes files within path
          {expand: true, cwd: 'src/', src: ['*'], dest: 'assets/', filter: 'isFile'},

          // includes files within path and its sub-directories
          {expand: true, cwd: 'src/vendor', src: ['**'], dest: 'assets/vendor'}

          // makes all src relative to cwd
          // {expand: true, cwd: 'path/', src: ['**'], dest: 'dest/'},

          // flattens results to a single level
          // {expand: true, flatten: true, src: ['path/**'], dest: 'dest/', filter: 'isFile'}
        ]
      }
    },
    browserify:     {
      options:      {
        debug : true,
        transform:  [ require('babelify').configure({sourceMap : true}) ]
      },
      app:          {
        src: 'src/js/main.js',
        dest: 'assets/bundle.js'
      }
    },
    uglify: {
      options: {
        mangle: false,
        compress : {
          unused : false
        },
        beautify : {
          ascii_only : true
        }
      },
      assets: {
        files: {
          'assets/bundle.min.js': ['assets/bundle.js'],
          'assets/vendor.min.js': ['src/vendor/*.js']
        }
      }
    },
    imageEmbed: {
      dist: {
        src: [ "src/base.css" ],
        dest: "assets/base.css",
        options: {
          deleteAfterEncoding : false
        }
      }
    },
    staticinline: {
      main: {
        files: {
          'assets/index.html': 'index.html',
        }
      }
    },
    watch: {
      scripts: {
        files: ['Gruntfile.js', 'src/js/*.js'],
        tasks: ['jshint:changed', 'default'],
        options: {
          spawn: false,
        },
      },
      jsx: {
        files: ['src/jsx/*.jsx'],
        tasks: ['jsxhint', 'default'],
        options: {
          spawn: false,
        },
      },
      other : {
        files: ['index.html','src/**/*.css', 'src/vendor/**/*'],
        tasks: ['default'],
        options: {
          spawn: false,
        },
      },
      tests : {
        files: ['tests/*.js'],
        tasks: ['jshint:js', 'node_tap:changed', 'default'],
        options: {
          interrupt: true,
        },
      }
    }
  })
  grunt.loadNpmTasks('grunt-newer');
  grunt.loadNpmTasks('grunt-browserify')
  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-node-tap');
  grunt.loadNpmTasks('grunt-static-inline');
  grunt.loadNpmTasks("grunt-image-embed");

  grunt.registerTask('jsxhint', ['babel', 'jshint:jsx']);
  grunt.registerTask('default', ['jshint:js', 'jsxhint', 'node_tap:all', 'copy:assets', 'browserify', 'imageEmbed','uglify', 'staticinline']);

  grunt.event.on('watch', function(action, filepath) {
    // for (var key in require.cache) {delete require.cache[key];}
    grunt.config('jshint.changed', [filepath]);
    grunt.file.write("watchChanged.json", JSON.stringify({
      node_tap : [filepath]
    }))
    grunt.config('node_tap.changed.files.tests', [filepath]);
  });
};
