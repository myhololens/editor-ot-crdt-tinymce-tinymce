import { JSON as Json } from '@ephox/sand';
import { Result } from '@ephox/katamari';

var sortKeys = function (label, keyName, array, order) {
  var sliced = array.slice(0);
  try {
    var sorted = sliced.sort(function (a, b) {
      var aKey = a[keyName]();
      var bKey = b[keyName]();
      var aIndex = order.indexOf(aKey);
      var bIndex = order.indexOf(bKey);
      if (aIndex === -1) throw new Error('The ordering for ' + label + ' does not have an entry for ' + aKey +
        '.\nOrder specified: ' + Json.stringify(order, null, 2));
      if (bIndex === -1) throw new Error('The ordering for ' + label + ' does not have an entry for ' + bKey +
        '.\nOrder specified: ' + Json.stringify(order, null, 2));
      if (aIndex < bIndex) return -1;
      else if (bIndex < aIndex) return 1;
      else return 0;
    });
    return Result.value(sorted);
  } catch (err) {
    return Result.error([ err ]);
  }
};

export default <any> {
  sortKeys: sortKeys
};