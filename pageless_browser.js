// DataScoller component
// Copyright 2008 Maxim Kulkin


if(typeof Prototype == 'undefined')
  throw("datascroller.js requires including Prototype library");

/* Component to organize "page-less" data loading.
 * Useful for allowing user navigate a limited set of data
 * without need to worry about pages.
 *
 * It requires that all items be the same height after loading.
 * Later on items can change height, but to provide
 * smooth user experience, they need to be the same height.
 *
 * Arguments to constructor:
 *   1. Id of container element for items
 *   2. Total number of items
 *   3. Optional options:
 *      * itemSize - the height of item in pixels (defaults to 20).
 *                   Used to calculate number of items on one page.
 *      * url - url to get items from (defaults to current page's url)
 *      * method - HTTP method to use to get items (defaults to 'get')
 *      * startParamName - name of range start parameter
 *      * countParamName - name of range size paramter
 *
 */
var PagelessBrowser = Class.create({
  initialize: function(container, count, options) {
    this.container = $(container)
    this.count = count

    this.options = Object.extend({
      itemSize: 20,
      url: window.location.href,
      method: 'get',
      startParamName: 'start',
      countParamName: 'count'
    }, options)

    // Initialize with dummy job to maintain invariant that job is always set
    this.updateJob = new PagelessBrowser.Job(0, function() {})

    this.rootSpacer = this.createSpacer(0, this.count)
    this.container.insert(this.rootSpacer.element)
    this.container.observe('scroll', this.onScroll.bindAsEventListener(this))

    this.pageSize = Math.max(Math.ceil(this.container.getDimensions().height*2/this.options.itemSize), 1)

    this.update()
  },
  // Determine what data (if any) needs to be loaded and launch update job
  update: function() {
    var visibleWindow = $R(this.container.scrollTop-100, this.container.scrollTop + this.container.getDimensions().height)

    var spacer = this.rootSpacer;
    while(spacer!=null) {
      var spacerWindow = $R(spacer.element.offsetTop, spacer.element.offsetTop+spacer.element.getDimensions().height)
      var intersection = this.intersectRanges(visibleWindow, spacerWindow)
      if(intersection) {
        var spacerLocalIntersection = $R(intersection.start - spacer.element.offsetTop, intersection.end - spacer.element.offsetTop)
        if(spacerLocalIntersection.start < this.options.itemSize) {
          // update data at the beginning of spacer
          var itemCount = Math.min(this.pageSize, Math.abs(spacer.end-spacer.start))
          var targetSpacer = spacer
          this.loadData(spacer.start, itemCount, function(data) {
            targetSpacer.element.insert({before: data})
            targetSpacer.start += itemCount
            this.resizeSpacer(targetSpacer)
          })
        } else if(spacerLocalIntersection.end > spacer.element.getDimensions().height-this.options.itemSize) {
          // update data at the end of spacer
          var itemCount = Math.min(this.pageSize, Math.abs(spacer.end-spacer.start))
          var targetSpacer = spacer
          this.loadData(spacer.end-itemCount, itemCount, function(data) {
            targetSpacer.element.insert({after: data})
            targetSpacer.end -= itemCount
            this.resizeSpacer(targetSpacer)
          })
        } else {
          // split spacer and update in the middle
          var start = spacer.start + Math.ceil(spacerLocalIntersection.start / this.options.itemSize)
          var targetSpacer = spacer
          this.loadData(start, this.pageSize, function(data) {
            var newSpacer = this.createSpacer(start+this.pageSize, targetSpacer.end)
            targetSpacer.end = start
            newSpacer.next = targetSpacer.next
            targetSpacer.next = newSpacer
            newSpacer.previous = targetSpacer
            if(newSpacer.next) newSpacer.next.previous = newSpacer

            targetSpacer.element.insert({after: newSpacer.element})
            targetSpacer.element.insert({after: data})

            this.resizeSpacer(targetSpacer)
            this.resizeSpacer(newSpacer)
          })
        }
      }

      spacer = spacer.next
    }
  },
  loadData: function(start, count, onLoaded) {
    var onLoaded = onLoaded.bind(this)

    var params = this.options.startParamName + '=' + start + '&' + 
                 this.options.countParamName + '=' + count

    this.updateJob.cancel()
    this.updateJob = new PagelessBrowser.Job(1000, function() {
      new Ajax.Request(this.options.url, {
        method: this.options.method,
        parameters: params,
        onComplete: function(response) { onLoaded(response.responseText) }
      })
    }.bind(this))
  },
  onScroll: function(event) {
    this.update()
  },
  createSpacer: function(start, end) {
    var element = document.createElement('div')
    element.addClassName('spacer')
    element.setStyle({height: Math.abs(end - start)*this.options.itemSize})
    return { start: start, end: end, element: element, previous: null, next: null }
  },
  resizeSpacer: function(spacer) {
    if(spacer.end <= spacer.start) {
      spacer.element.remove()
      if(!spacer.previous) {
        this.rootSpacer = spacer.next
      } else {
        spacer.previous.next = spacer.next
      }
    } else {
      spacer.element.setStyle({height: (spacer.end - spacer.start)*this.options.itemSize + 'px'})
    }
  },
  intersectRanges: function(r1, r2) {
    var start = Math.max(r1.start, r2.start)
    var end = Math.min(r1.end, r2.end)

    if(start >= end)
      return null;

    return $R(start, end)
  }
})


/*
 * The wrapper for setTimeout to add two features:
 * 1. Send delay: the callback is called after specified amount of time.
 * 2. Cancel: ability to cancel job so that if callback won't be called.
 *    If callback was already called - does nothing.
 */

PagelessBrowser.Job = Class.create({
  initialize: function(delay, callback) {
    this.cancelled = false
    this.callback = callback

    var onTimeout = function() {
      if(!this.cancelled)
        this.callback()
    }.bind(this)
    
    setTimeout(onTimeout, delay)
  },
  cancel: function() {
    this.cancelled = true
  }
})
