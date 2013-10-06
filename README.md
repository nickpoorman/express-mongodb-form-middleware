#express-mongodb-form-middleware

Extremely opinionated resource middleware for express and mongoDB.

For the specific use case where you want to provide view, validator, and persistence middleware for a resource.

This was created to save time when implementing a long multi-step form process.

[![build status](https://secure.travis-ci.org/nickpoorman/express-mongodb-form-middleware.png)](https://travis-ci.org/nickpoorman/express-mongodb-form-middleware)

# example

easily provide resources for a form:

``` js
var app = express();

var viewPath = 'form';
var selectOptions = ['Yes', 'No', 'Maybe'];

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
var FormMiddleware = require('express-mongodb-form-middleware');
```

## var fm = new FormMiddleware()

Create a new `FormMiddleware` object.

The returned object `fm` is a `FormMiddleware`. 

## fm.viewPath(viewPath)

Set the `viewPath` to location of the view on disk.

## fm.field(opts)

Add a field that can be passed to the view, validated, and/or saved.

`opts.locals` would be any properties the view might use.

## fm.validator(opts)

Validate a field. Uses [node-validator](https://github.com/chriso/node-validator) validators.

## fm.update(field, fn)

Updates the property on the object with the given `field`.

`field` can be an array of field names.

`fn` is a function that returns the object on which `field` is to be updated. `fn` provides `req, res` as parameters.

## fm.save(fn[, hookFn])

Save (persists) an object to the database. This is where you would save the parent object [optionally, after updating an embedded object].

`fn` is a function that returns the object to be saved. `fn` provides `req, res` as parameters.

`hookFn` is an optional function to do anything that might need to be done before saving. ie. `push()`ing an embedded object into a parent object.

## fm.next(fn)

Specify a function callback to handle the final step after all the objects have been saved.

`fn` provides `savedObj, req, res` as parameters, where `savedObj` is the object that was just saved. 

Note: `fm.next(fn)` will not be called if there was an error from the database. In the event of an error the middleware will call `next(err)` internally.

## var middleware = fm.middleware()

Creates the middleware based on the configured `FormMiddleware` object.

## middleware.render(req, res, next)

This middlware will render the provided view.

## middleware.validate(req, res, next)

This middlware will validate the configured params.

## middleware.update(req, res, next)

This middleware will update the configured params on the given objects.

## middleware.save(req, res, next)

This middleware will persist the given objects to the database.

## middleware.validateUpdateSave()

Returns an array of the `validate`, `update`, and `save` middleware.

# install

With [npm](https://npmjs.org) do:

```
npm install express-mongodb-form-middleware
```

# license

MIT