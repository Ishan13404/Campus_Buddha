(function($, window, document, undefined) {
    var lazyLoadXT = 'lazyLoadXT',
        dataLazied = 'lazied',
        load_error = 'load error',
        classLazyHidden = 'lazy-hidden',
        docElement = document.documentElement || document.body,
        forceLoad = (window.onscroll === undefined || !!window.operamini || !docElement.getBoundingClientRect),
        options = {
            autoInit: true,
            selector: 'img[data-src]',
            blankImage: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            throttle: 99,
            forceLoad: forceLoad,
            loadEvent: 'pageshow',
            updateEvent: 'load orientationchange resize scroll touchmove focus',
            forceEvent: 'lazyloadall',
            oninit: {
                removeClass: 'lazy'
            },
            onshow: {
                addClass: classLazyHidden
            },
            onload: {
                removeClass: classLazyHidden,
                addClass: 'lazy-loaded'
            },
            onerror: {
                removeClass: classLazyHidden
            },
            checkDuplicates: true
        },
        elementOptions = {
            srcAttr: 'data-src',
            edgeX: 0,
            edgeY: 0,
            visibleOnly: true
        },
        $window = $(window),
        $isFunction = $.isFunction,
        $extend = $.extend,
        $data = $.data || function(el, name) {
            return $(el).data(name);
        },
        elements = [],
        topLazy = 0,
        waitingMode = 0;
    $[lazyLoadXT] = $extend(options, elementOptions, $[lazyLoadXT]);

    function getOrDef(obj, prop) {
        return obj[prop] === undefined ? options[prop] : obj[prop];
    }

    function scrollTop() {
        var scroll = window.pageYOffset;
        return (scroll === undefined) ? docElement.scrollTop : scroll;
    }
    $.fn[lazyLoadXT] = function(overrides) {
        overrides = overrides || {};
        var blankImage = getOrDef(overrides, 'blankImage'),
            checkDuplicates = getOrDef(overrides, 'checkDuplicates'),
            scrollContainer = getOrDef(overrides, 'scrollContainer'),
            forceShow = getOrDef(overrides, 'show'),
            elementOptionsOverrides = {},
            prop;
        $(scrollContainer).on('scroll', queueCheckLazyElements);
        for (prop in elementOptions) {
            elementOptionsOverrides[prop] = getOrDef(overrides, prop);
        }
        return this.each(function(index, el) {
            if (el === window) {
                $(options.selector).lazyLoadXT(overrides);
            } else {
                var duplicate = checkDuplicates && $data(el, dataLazied),
                    $el = $(el).data(dataLazied, forceShow ? -1 : 1);
                if (duplicate) {
                    queueCheckLazyElements();
                    return;
                }
                if (blankImage && el.tagName === 'IMG' && !el.src) {
                    el.src = blankImage;
                }
                $el[lazyLoadXT] = $extend({}, elementOptionsOverrides);
                triggerEvent('init', $el);
                elements.push($el);
                queueCheckLazyElements();
            }
        });
    };

    function triggerEvent(event, $el) {
        var handler = options['on' + event];
        if (handler) {
            if ($isFunction(handler)) {
                handler.call($el[0]);
            } else {
                if (handler.addClass) {
                    $el.addClass(handler.addClass);
                }
                if (handler.removeClass) {
                    $el.removeClass(handler.removeClass);
                }
            }
        }
        $el.trigger('lazy' + event, [$el]);
        queueCheckLazyElements();
    }

    function triggerLoadOrError(e) {
        triggerEvent(e.type, $(this).off(load_error, triggerLoadOrError));
    }

    function checkLazyElements(force) {
        if (!elements.length) {
            return;
        }
        force = force || options.forceLoad;
        topLazy = Infinity;
        var viewportTop = scrollTop(),
            viewportHeight = window.innerHeight || docElement.clientHeight,
            viewportWidth = window.innerWidth || docElement.clientWidth,
            i, length;
        for (i = 0, length = elements.length; i < length; i++) {
            var $el = elements[i],
                el = $el[0],
                objData = $el[lazyLoadXT],
                removeNode = false,
                visible = force || $data(el, dataLazied) < 0,
                topEdge;
            if (!$.contains(docElement, el)) {
                removeNode = true;
            } else if (force || !objData.visibleOnly || el.offsetWidth || el.offsetHeight) {
                if (!visible) {
                    var elPos = el.getBoundingClientRect(),
                        edgeX = objData.edgeX,
                        edgeY = objData.edgeY;
                    topEdge = (elPos.top + viewportTop - edgeY) - viewportHeight;
                    visible = (topEdge <= viewportTop && elPos.bottom > -edgeY && elPos.left <= viewportWidth + edgeX && elPos.right > -edgeX);
                }
                if (visible) {
                    $el.on(load_error, triggerLoadOrError);
                    triggerEvent('show', $el);
                    var srcAttr = objData.srcAttr,
                        src = $isFunction(srcAttr) ? srcAttr($el) : el.getAttribute(srcAttr);
                    if (src) {
                        el.src = src;
                    }
                    removeNode = true;
                } else {
                    if (topEdge < topLazy) {
                        topLazy = topEdge;
                    }
                }
            }
            if (removeNode) {
                $data(el, dataLazied, 0);
                elements.splice(i--, 1);
                length--;
            }
        }
        if (!length) {
            triggerEvent('complete', $(docElement));
        }
    }

    function timeoutLazyElements() {
        if (waitingMode > 1) {
            waitingMode = 1;
            checkLazyElements();
            setTimeout(timeoutLazyElements, options.throttle);
        } else {
            waitingMode = 0;
        }
    }

    function queueCheckLazyElements(e) {
        if (!elements.length) {
            return;
        }
        if (e && e.type === 'scroll' && e.currentTarget === window) {
            if (topLazy >= scrollTop()) {
                return;
            }
        }
        if (!waitingMode) {
            setTimeout(timeoutLazyElements, 0);
        }
        waitingMode = 2;
    }

    function initLazyElements() {
        $window.lazyLoadXT();
    }

    function forceLoadAll() {
        checkLazyElements(true);
    }
    $(document).ready(function() {
        triggerEvent('start', $window);
        $window.on(options.updateEvent, queueCheckLazyElements).on(options.forceEvent, forceLoadAll);
        $(document).on(options.updateEvent, queueCheckLazyElements);
        if (options.autoInit) {
            $window.on(options.loadEvent, initLazyElements);
            initLazyElements();
        }
    });
})(window.jQuery || window.Zepto || window.$, window, document);