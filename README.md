#express-mongoDB-form-middleware

Extremely opinionated resource middleware for express and mongoDB.

For the specific use case where you want to provide view, validator, and persistence middleware for a resource.

This was created to save time when implementing a long multi-step form process.

[![build status](https://secure.travis-ci.org/nickpoorman/express-mongoDB-form-middleware.png)](https://travis-ci.org/nickpoorman/express-mongoDB-form-middleware)

# example

easily provide resources for a form:

``` js
  var app = express();
  app.set("views", __dirname + "/views");
  app.set('view engine', 'jade');
  app.set('view options', {
    doctype: 'html'
  });

  var fc = new FormMiddleware()
    .viewPath(viewPath)
    .field({type: 'select', name: 'testField', options: selectOptions })
    .validator({fn: 'notEmpty', param: 'testField', msg: 'Test field cannot be empty'})
    .validator({fn: 'isIn', param: 'testField', msg: 'Valid option required', }, selectOptions)
    .save('testField', function(req, res) { return req.testObj })
    .next(function(savedObj, req, res) {return res.redirect('/' + savedObj.id); })

  var m = fc.middleware();

  app.get('/', m.render);
  app.post('/', m.validateAndSave);

```

# methods

``` js
var FormMiddleware = require('express-mongoDB-form-middleware');
```

## var fm = new FormMiddleware()

Create a new FormController.

The returned object `fm` is a `FormController`. 

## fm.viewPath(viewPath)

Set the `viewPath` to location of the view on disk.

## fm.field(opts)

Add a field that can be passed to the view, validated, and/or saved.

## fm.validator(opts)

Validate a field. Uses [node-validator](https://github.com/chriso/node-validator) validators.

## fm.save(field, fn)

Save fields to the database.

`field` is the field to save from the form into the database. Optionally, `field` can be an array of field names.

`fn` is a function that returns the object on which `field` is to be saved. `fn` provides `req, res` as parameters.

## fm.next(fn)

Specify a function callback to handle the final step after all the objects have been saved.

`fn` provides `savedObj, req, res` as parameters, where `savedObj` is the object that was just saved. 

Note: `fm.next(fn)` will not be called if there was an error from the database. In the event of an error the middleware will call `next(err)` internally.

# install

With [npm](https://npmjs.org) do:

```
npm install express-mongoDB-form-middleware
```

# license

MIT