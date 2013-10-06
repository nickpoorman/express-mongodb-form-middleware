var _ = require('underscore');

module.exports = FormMiddleware;

function FormMiddleware(opts) {
  if (!(this instanceof FormMiddleware)) return new FormMiddleware(opts);

  this.opts = opts || {};
  this.fields = [];
  this.updates = [];
  this.saves = [];
  this.validators = {};
  this.saveHook;

  return this;
}

// setters -----------------------------------------

/*
  This is the path to the view on disk.
 */
FormMiddleware.prototype.viewPath = function(path) {
  this._viewPath = path;
  return this;
}

/*
  Add a field to the list of fields.
  opts*: name
 */
FormMiddleware.prototype.field = function(opts) {
  var field = new Field(opts);
  if (!field) return null;
  this.fields.push(field);
  return this;
}

/*
  Add a validator to be used on a param.
  Any params to the validator itself should be appended to the signature.
 */
FormMiddleware.prototype.validator = function(opts) {
  opts = opts || {};

  // mandatory
  if (!opts.fn) return null;
  if (!opts.param) return null;

  var args = [];
  if (arguments.length > 1) {
    args = Array.prototype.slice.call(arguments, 1);
  }

  if (typeof this.validators[opts.param] === 'undefined') {
    this.validators[opts.param] = [];
  }
  this.validators[opts.param].push({
    fn: opts.fn,
    args: args,
    msg: opts.msg
  });

  return this;
}

/*
  Add a field to be updated on the object.
 */
FormMiddleware.prototype.update = function(param, objFn) {
  if (!param) return null;
  if (!objFn || typeof objFn !== 'function') return null;

  var params = [];
  if (!_.isArray(param)) {
    params.push(param);
  } else {
    params = param;
  }

  for (var i = 0; i < params.length; i++) {
    this.updates.push({
      param: params[i],
      objFn: objFn
    });
  }

  return this;
}

/*
  Persist the object to the database. This is where you would save
   the parent object after updating an embedded object. 

  Could potentially have multiple objects that get saved.
  - objFn will be a function that gets the object to be saved at runtime
*/
FormMiddleware.prototype.save = function(objFn, hookFn) {
  if (!objFn || typeof objFn !== 'function') return null;
  if (hookFn && typeof hookFn !== 'function') return null;

  this.saveHook = hookFn;
  this.saves.push(objFn);
  return this;
}

/*
  This is the route we will route to after the save.
 */
FormMiddleware.prototype.next = function(fn) {
  this._next = fn;
  return this;
}


// middleware ----------------------------------

FormMiddleware.prototype.middleware = function() {
  var middleware = {};

  middleware.render = function(req, res, next) {
    res.locals.fields = this.fields;
    return res.render(this._viewPath);
  }.bind(this);

  middleware.validate = function(req, res, next) {
    // go through each of the fields and add it to the locals for re-rendering in the view
    res.locals.params = {};
    for (var i = 0; i < this.fields.length; i++) {
      res.locals.params[this.fields[i].name] = req.body[this.fields[i].name];
    }

    // attach all the validators
    for (var i = 0; i < this.validators.length; i++) {
      var va = this.validators[i];
      for (var j = 0; j < va.length; j++) {
        var v = va[j];
        var context = req.assert(param, v.msg);
        context[v.fn].apply(context, v.args);
      }
    }

    var mappedErrors = req.validationErrors();
    if (mappedErrors) {
      // don't attempt to save, return the errors
      return res.render(this._viewPath, {
        errors: mappedErrors
      });
    }

    for (var i = 0; i < this.fields.length; i++) {
      req.sanitize(this.fields[i].name).trim();
    }
    return next();
  }.bind(this);

  middleware.update = function(req, res, next) {
    // create unique array of all the objects that will have properties updated
    for (var i = 0; i < this.updates.length; i++) {
      var obj = this.updates[i].objFn.call(this, req, res);
      obj[this.updates[i].param] = req.body[this.updates[i].param];
    }
    return next();
  }.bind(this);

  /*
    It's possible an object could be saved,
    and another could return an error.
   */
  middleware.save = function(req, res, next) {
    var self = this;

    if (typeof this.saveHook === 'function') {
      this.saveHook(req, res);
    }

    var semaphore = this.saves.length;

    for (var i = 0; i < this.saves.length; i++) {
      var s = this.saves[i].call(this, req, res);
      // now save it
      s.save(function(err, savedObj) {
        if (err) {
          semaphore++; // little hack so our next never get's called
          return next(err);
        }

        semaphore--;
        if (semaphore === 0) {
          // last callback so return
          return self._next.call(self, savedObj, req, res, next);
        }
      });
    }
  }.bind(this);

  middleware.validateUpdateSave = [middleware.validate, middleware.update, middleware.save];

  return middleware;
}



// Field class ----------------------------------------

function Field(opts) {
  if (!(this instanceof Field)) return new Field(opts);

  opts = opts || {};
  var self = this;

  // defaults
  if (!opts.type) {
    opts.type = 'input'
  } else {
    opts.type = opts.type.toLowerCase();
  }

  // mandatory
  if (!opts.name) return null;
  if (opts.type === 'select' && !opts.options) return null;

  self.name = opts.name;

  switch (opts.type) {
    case 'input':
      break;
    case 'select':
      if (_.isArray(opts.options)) {
        // turn it into a hash
        opts.options = _.object(opts.options, opts.options);
      }
      self.options = opts.options;
      break;
    default:
      return null;
  }

  return self;
}