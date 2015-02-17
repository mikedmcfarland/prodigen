var gulp     = require('gulp')
var Engulped = require('engulped')

var engulped = Engulped.withDefaultTasks(gulp)

var tasks = engulped.tasks()
gulp.task('default',['test','build'])
