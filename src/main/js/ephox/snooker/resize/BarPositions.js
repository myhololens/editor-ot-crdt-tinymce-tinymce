define(
  'ephox.snooker.resize.BarPositions',

  [
    'ephox.katamari.api.Arr',
    'ephox.katamari.api.Fun',
    'ephox.katamari.api.Struct',
    'ephox.sugar.api.view.Height',
    'ephox.sugar.api.view.Location',
    'ephox.sugar.api.view.Width'
  ],

  function (Arr, Fun, Struct, Height, Location, Width) {
    var rowInfo = Struct.immutable('row', 'y');
    var colInfo = Struct.immutable('col', 'x');

    var rtlEdge = function (cell) {
      var pos = Location.absolute(cell);
      return pos.left() + Width.getOuter(cell);
    };

    var ltrEdge = function (cell) {
      return Location.absolute(cell).left();
    };

    var getLeftEdge = function (index, cell) {
      return colInfo(index, ltrEdge(cell));
    };

    var getRightEdge = function (index, cell) {
      return colInfo(index, rtlEdge(cell));
    };

    var getTop = function (cell) {
      return Location.absolute(cell).top();
    };

    var getTopEdge = function (index, cell) {
      return rowInfo(index, getTop(cell));
    };

    var getBottomEdge = function (index, cell) {
      return rowInfo(index, getTop(cell) + Height.getOuter(cell));
    };

    var findPositions = function (getInnerEdge, getOuterEdge, array) {
      if (array.length === 0 ) return [];
      var lines = Arr.map(array.slice(1), function (cellOption, index) {
        return cellOption.map(function (cell) {
          return getInnerEdge(index, cell);
        });
      });

      var lastLine = array[array.length - 1].map(function (cell) {
        return getOuterEdge(array.length - 1, cell);
      });

      return lines.concat([ lastLine ]);
    };

    var negate = function (step, _table) {
      return -step;
    };

    var height = {
      delta: Fun.identity,
      positions: Fun.curry(findPositions, getTopEdge, getBottomEdge),
      edge: getTop
    };

    var ltr = {
      delta: Fun.identity,
      edge: ltrEdge,
      positions: Fun.curry(findPositions, getLeftEdge, getRightEdge)
    };

    var rtl = {
      delta: negate,
      edge: rtlEdge,
      positions: Fun.curry(findPositions, getRightEdge, getLeftEdge)
    };

    return {
      height: height,
      rtl: rtl,
      ltr: ltr
    };
  }
);