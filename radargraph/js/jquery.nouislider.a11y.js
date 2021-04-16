/**
 * https://gist.github.com/felixgirault/3fcb18ee0268b1c3127c
 *  Adds an accessibility layer to the default noUiSlider.
 *
 *  @see $.fn.noUiSlider()
 */
$.fn.noUiSliderA11y = function(options, rebuild) {
    var slider = this;

    if (!('noUiSlider' in slider)) {
        throw new Error('noUiSlider is not loaded.');
    }

    // step must be defined in order for the keyboard navigation to work
    var settings = $.extend({
        step: 1
    }, options);

    slider.noUiSlider(settings, rebuild);

    if ('range' in settings) {
        var handles = slider.find('.noUi-handle');
        var min = settings.range.min;
        var max = settings.range.max;

        handles.each(function(i) {
            setupHandle(slider, $(this), i, min, max);
        });
    }
};

/**
 *  Finds a limit in the given set of options.
 *
 *  @param object slider Slider.
 *  @param object handle Handle.
 *  @param int handleIndex Index of the handle.
 *  @param int min Minimum value.
 *  @param int max Maximum value.
 */
function setupHandle(slider, handle, handleIndex, min, max) {
    // adds aria attributes
    handle.attr('tabindex', 0);
    handle.attr('role', 'slider');
    handle.attr('aria-valuemin', min);
    handle.attr('aria-valuemax', max);
    handle.attr('aria-valuenow', slider.val());

    // updates the current value when it changes
    slider.on('set', function() {
        handle.attr('valuenow', slider.val());
    });

    // handles keyboard updates
    // see http://refreshless.com/nouislider/examples/#section-keypress
    handle.on('keydown', function(event) {
        var value = Number(slider.val());
        var steps = slider.noUiSlider('step');
        var handleSteps = steps[handleIndex];

        switch (event.which) {
            case 40: // down
            case 37: // left
                // decrements value by a single step
                slider.val(value - handleSteps[0]);
                break;

            case 38: // up
            case 39: // right
                // increments value by a single step
                slider.val(value + handleSteps[1]);
                break;

            case 34: // page down
                // decrements value by 10 steps
                slider.val(value - (handleSteps[0] * 10));
                break;

            case 33: // page up
                // increments value by 10 steps
                slider.val(value + (handleSteps[1] * 10));
                break;

            case 36: // home
                slider.val(min);
                break;

            case 35: // end
                slider.val(max);
                break;

            default:
                return;
        }

        event.preventDefault();
    });
}
