module.exports = function(grunt) {

	var banner = '/*!\n' +
		'* ActiveTable \n' +
		'* v<%= pkg.version %>\n' +
		'* Licensed under the MIT license.\n' +
		'* @see: http://github.com/holiber/activetable\n' +
		'*/\n\n';

	grunt.initConfig({

		pkg: grunt.file.readJSON('bower.json'),

		concat: {
			options: {
				banner: banner
			},
			all: {
				src: ['src/table.js', 'src/plugins/*.js'],
				dest: 'dist/table.js'
			},
			tiny: {
				src: ['src/table.js'],
				dest: 'dist/table.tiny.js'
			}
		},

		uglify: {
			options: {
				preserveComments: 'some'
			},
			all: {
				files: {
					'dist/table.min.js': 'dist/table.js',
					'dist/table.tiny.min.js': 'dist/table.tiny.js'
				}
			}
		}
	});
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask('build', ['concat', 'uglify']);
}