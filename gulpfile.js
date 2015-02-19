var gulp     = require('gulp')
var Engulped = require('engulped')
var nodemon = require('nodemon')

var engulped = Engulped.withDefaultTasks(gulp)

var tasks = engulped.tasks()
gulp.task('default',['test'])
gulp.task('test',['build'],tasks.test())

gulp.task('watch', function(){
  nodemon({
    exec : 'gulp',
    ignore: ['dist','fixtures/build']
  })
})
