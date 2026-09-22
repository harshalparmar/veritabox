// Strips MongoDB operator injection from user input.
// Removes any object key beginning with '$' or containing '.', recursively.
// Mutates objects in place because Express 5's req.query has no setter.
function scrub(value, depth = 0) {
  if (depth > 20 || value === null || typeof value !== 'object') return;

  if (Array.isArray(value)) {
    for (const item of value) scrub(item, depth + 1);
    return;
  }

  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete value[key];
      continue;
    }
    scrub(value[key], depth + 1);
  }
}

export function mongoSanitize(req, _res, next) {
  scrub(req.body);
  scrub(req.query);
  scrub(req.params);
  next();
}
