define(
  'ephox.alloy.positioning.view.Bounder',

  [
    'ephox.alloy.positioning.layout.Direction',
    'ephox.alloy.positioning.view.Reposition',
    'ephox.katamari.api.Adt',
    'ephox.katamari.api.Arr',
    'ephox.katamari.api.Fun',
    'global!Math'
  ],

  function (Direction, Reposition, Adt, Arr, Fun, Math) {
    var adt = Adt.generate([
      { fit:   [ 'reposition' ] },
      { nofit: [ 'reposition', 'deltaW', 'deltaH' ] }
    ]);

    var attempt = function (candidate, width, height, bounds) {
      var candidateX = candidate.x();
      var candidateY = candidate.y();
      var bubbleLeft = candidate.bubble().left();
      var bubbleTop = candidate.bubble().top();

      var boundsX = bounds.x();
      var boundsY = bounds.y();
      var boundsWidth = bounds.width();
      var boundsHeight = bounds.height();

      // candidate position is excluding the bubble, so add those values as well
      var newX = candidateX + bubbleLeft;
      var newY = candidateY + bubbleTop;

      // simple checks for "is the top left inside the view"
      var xInBounds = newX >= boundsX;
      var yInBounds = newY >= boundsY;
      var originInBounds = xInBounds && yInBounds;

      // simple checks for "is the bottom right inside the view"
      var xFit = (newX + width) <= (boundsX + boundsWidth);
      var yFit = (newY + height) <= (boundsY + boundsHeight);
      var sizeInBounds = xFit && yFit;

      // measure how much of the width and height are visible. deltaW isn't necessary in the fit case but it's cleaner to read here.
      var deltaW = xInBounds ? Math.min(width, boundsX + boundsWidth - newX)
                             : Math.abs(boundsX - (newX + width));
      var deltaH = yInBounds ? Math.min(height, boundsY + boundsHeight - newY)
                             : Math.abs(boundsY - (newY + height));


      // TBIO-3366 + TBIO-4236:
      // Futz with the X position to ensure that x is positive, but not off the right side of the screen.
      var maxX = bounds.width() - width;
      var minX = Math.max(0, newX);
      var limitX = Math.min(minX, maxX);

      // Futz with the Y value to ensure that we're not off the top of the screen
      var limitY = yInBounds ? newY : newY + (height - deltaH);

      // TBIO-3367 + TBIO-3387:
      // Futz with the "height" of the popup to ensure if it doesn't fit it's capped at the available height.
      // As of TBIO-4291, we provide all available space for both up and down.
      var upAvailable = Fun.constant((limitY + deltaH) - boundsY);
      var downAvailable = Fun.constant((boundsY + boundsHeight) - limitY);
      var maxHeight = Direction.cata(candidate.direction(), downAvailable, downAvailable, upAvailable, upAvailable);

      // We don't futz with the width.

      var reposition = Reposition.decision({
          x: limitX,
          y: limitY,
          width: deltaW,
          height: deltaH,
          maxHeight: maxHeight,
          direction: candidate.direction(),
          classes: candidate.anchors(),
          label: candidate.label(),
          candidateYforTest: newY
        });

      // Take special note that we don't use the futz values in the nofit case; whether this position is a good fit is separate
      // to ensuring that if we choose it the popup is actually on screen properly.
      return originInBounds && sizeInBounds ? adt.fit(reposition) : adt.nofit(reposition, deltaW, deltaH);

      // useful debugging that I don't want to lose
      /*
      console.log(candidate.label());
      console.log('xfit', (boundsX + boundsWidth), ',', (newX + width), ',',newX);
      console.log('yfit', (boundsY + boundsHeight), ',', (newY + height), ',',newY, ',',height);
      console.log(sizeInBounds);
      console.log('x', xInBounds, xFit, '\t', Math.round(deltaW), '\t', (boundsX === 0 ? '000' : Math.round(boundsX)), '\t', Math.round(boundsWidth), '\t', Math.round(candidate.x()), '\t', Math.round(newX), '\t', '---', '\t', width);
      console.log('y', yInBounds, yFit, '\t', Math.round(deltaH), '\t', (boundsY === 0 ? '000' : Math.round(boundsY)), '\t', Math.round(boundsHeight), '\t', Math.round(candidate.y()), '\t', Math.round(newY), '\t', height);
      console.log('maxheight:', deltaH, maxHeight);
      console.log(originInBounds && sizeInBounds ? 'fit' : 'nofit');
      */
    };

    /**
     * Attempts to fit a box (generally a menu).
     *
     * candidates: an array of layout generators, generally obtained via api.Layout or api.LinkedLayout
     * anchorBox: the box on screen that triggered the menu, we must touch one of the edges as defined by the candidate layouts
     * elementBox: the popup (only width and height matter)
     * bubbles: the bubbles for the popup (see api.Bubble)
     * bounds: the screen
     */
    var attempts = function (candidates, anchorBox, elementBox, bubbles, bounds) {
      var panelWidth = elementBox.width();
      var panelHeight = elementBox.height();
      var attemptBestFit = function (layout, reposition, deltaW, deltaH) {
        var next = layout(anchorBox, elementBox, bubbles);
        var attemptLayout = attempt(next, panelWidth, panelHeight, bounds);

        // unwrapping fit only to rewrap seems... silly
        return attemptLayout.fold(adt.fit, function (newReposition, newDeltaW, newDeltaH) {
          var improved = newDeltaW > deltaW || newDeltaH > deltaH;
          // console.log('improved? ', improved);
          // re-wrap in the ADT either way
          return improved ? adt.nofit(newReposition, newDeltaW, newDeltaH)
                          : adt.nofit(reposition, deltaW, deltaH);
        });
      };

      var abc = Arr.foldl(candidates, function (b, a) {
        var bestNext = Fun.curry(attemptBestFit, a);
        // unwrapping fit only to rewrap seems... silly
        return b.fold(adt.fit, bestNext);
      },
        // fold base case: No candidates, it's never going to be correct, so do whatever
        adt.nofit(Reposition.decision({
          x: anchorBox.x(),
          y: anchorBox.y(),
          width: elementBox.width(),
          height: elementBox.height(),
          maxHeight: elementBox.height(),
          direction: Direction.southeast(),
          classes: [],
          label: 'none',
          candidateYforTest: anchorBox.y()
        }), -1, -1)
      );

      // unwrapping 'reposition' from the adt, for both fit & nofit the first arg is the one we need,
      // so we can cheat and use Fun.identity
      return abc.fold(Fun.identity, Fun.identity);
    };

    return {
      attempts: attempts
    };
  }
);