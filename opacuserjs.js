/*
 * Koha OPAC New Arrivals Scroller - behaviour.
 * Append to the opacuserjs system preference.
 *
 * Copyright (C) L2C2 Technologies
 * Author: Indranil Das Gupta
 * Licensed under the GNU General Public License v3.0 or later.
 */

/* === New Arrivals scroller === */
(function($) {
  'use strict';

  // ======================================================================
  // CONFIGURATION - edit these to suit your site
  // ======================================================================
  var NA_CONFIG = {
    // ID of the saved SQL report in Koha (see report.sql)
    reportId: 5,

    // Public URL to a loading spinner GIF. Used for initial fetch and
    // for the navigation overlay. Must be reachable from the user's browser.
    spinnerUrl: '',

    // Number of milliseconds between scroll steps
    stepInterval: 3500,

    // CSS transition duration for each scroll step
    transitionMs: 600,

    // Approximate number of rows visible in the viewport.
    // The viewport height is capped at this many average row heights,
    // leaving a "peek" at the bottom that hints at scrollability.
    visibleRows: 2.7,

    // Koha OPAC paths. Override these only for non-standard installs.
    opacDetailPath: '/cgi-bin/koha/opac-detail.pl?biblionumber=',
    opacSearchPath: '/cgi-bin/koha/opac-search.pl',
    opacImagePath:  '/cgi-bin/koha/opac-image.pl?thumbnail=1&biblionumber='
  };
  // ======================================================================

  var REPORT_URL = '/cgi-bin/koha/svc/report?id=' + NA_CONFIG.reportId + '&annotated=1';

  // -------- Cover fallback chain (Koha -> Amazon -> no-image) --------
  window.naCoverError = function(img) {
    var $img = $(img);
    var stage = $img.data('stage');
    var isbn = $img.data('isbn');
    if (stage === 'koha' && isbn) {
      $img.data('stage', 'amazon');
      img.src = 'https://images-na.ssl-images-amazon.com/images/P/' + isbn + '.01.MZZZZZZZ.jpg';
    } else {
      $img.replaceWith('<div class="na-noimage">No cover available</div>');
    }
  };

  window.naCoverLoad = function(img) {
    if (img.naturalHeight <= 1) {
      window.naCoverError(img);
    }
  };

  // -------- ISBN-13 to ISBN-10 (for Amazon /images/P/ URL) --------
  function normalizeIsbn(raw) {
    if (!raw) return '';
    var isbn = String(raw).toUpperCase().replace(/[^0-9X]/g, '');
    if (isbn.length === 13 && isbn.indexOf('978') === 0) {
      var core = isbn.substring(3, 12);
      var sum = 0;
      for (var i = 0; i < 9; i++) {
        sum += (10 - i) * parseInt(core.charAt(i), 10);
      }
      var check = (11 - (sum % 11)) % 11;
      return core + (check === 10 ? 'X' : check);
    }
    return isbn;
  }

  // -------- Helpers --------
  function escHtml(s) {
    return $('<div>').text(s == null ? '' : String(s)).html();
  }
  function escAttr(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function fmtDate(d) {
    if (!d) return '';
    return String(d).substring(0, 10);
  }

  function showToast(msg) {
    var $t = $('<div class="na-toast"></div>').text(msg);
    $('body').append($t);
    setTimeout(function() { $t.addClass('show'); }, 10);
    setTimeout(function() {
      $t.removeClass('show');
      setTimeout(function() { $t.remove(); }, 300);
    }, 2000);
  }

  // -------- Navigation overlay (shown on link click until page navigates) --------
  function showNavOverlay() {
    if ($('.na-nav-overlay').length) return;
    var $overlay = $('<div class="na-nav-overlay">'
      + '<img src="' + NA_CONFIG.spinnerUrl + '" alt="Loading" />'
      + '<div class="na-nav-msg">Loading, please wait...</div>'
      + '</div>');
    $('body').append($overlay);
  }

  function hideNavOverlay() {
    $('.na-nav-overlay').remove();
  }

  // -------- Share handler --------
  function shareBiblio(biblionumber, title) {
    var url = window.location.origin + NA_CONFIG.opacDetailPath + biblionumber;
    if (navigator.share) {
      navigator.share({ title: title, text: title, url: url }).catch(function() {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function() {
        showToast('Link copied to clipboard');
      }).catch(function() {
        legacyCopy(url);
      });
      return;
    }
    legacyCopy(url);
  }

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Link copied to clipboard');
    } catch (e) {
      showToast('Could not copy link');
    }
    document.body.removeChild(ta);
  }

  // -------- Row builder --------
  function buildRow(row) {
    var biblionumber = row.biblionumber;
    var rawIsbn = row.isbn || '';
    var isbn10  = normalizeIsbn(rawIsbn);
    var title   = row.title || 'Untitled';
    var author  = row.author || '';
    var subject = row.subject || '';
    var dateacc = fmtDate(row.dateaccessioned);

    var hasAuthor  = author && author !== 'N/A';
    var hasSubject = !!subject;

    var detailUrl = NA_CONFIG.opacDetailPath + biblionumber;

    var coverImg = '<img src="' + NA_CONFIG.opacImagePath + biblionumber + '"'
      + ' data-isbn="' + escAttr(isbn10) + '" data-stage="koha"'
      + ' onerror="naCoverError(this);" onload="naCoverLoad(this);" alt="" />';

    var authorBtn = hasAuthor
      ? '<a class="na-btn" href="' + NA_CONFIG.opacSearchPath + '?idx=au&q=' + encodeURIComponent(author) + '" title="More by this author"><i class="fas fa-user"></i></a>'
      : '<span class="na-btn disabled" title="No author available"><i class="fas fa-user"></i></span>';

    var subjectBtn = hasSubject
      ? '<a class="na-btn" href="' + NA_CONFIG.opacSearchPath + '?idx=su&q=' + encodeURIComponent(subject) + '" title="More on this subject"><i class="fas fa-tags"></i></a>'
      : '<span class="na-btn disabled" title="No subject available"><i class="fas fa-tags"></i></span>';

    var shareBtn = '<button class="na-btn na-btn-share" type="button"'
      + ' data-biblionumber="' + escAttr(biblionumber) + '"'
      + ' data-title="' + escAttr(title) + '"'
      + ' title="Share"><i class="fas fa-share-alt"></i></button>';

    var subjectLine = hasSubject
      ? '<span class="na-subject"><i class="fas fa-tags"></i>' + escHtml(subject) + '</span>'
      : '';

    return '<li class="na-item">'
      + '<div class="na-body">'
      +   '<a class="na-cover" href="' + detailUrl + '">' + coverImg + '</a>'
      +   '<div class="na-meta">'
      +     '<a class="na-title" href="' + detailUrl + '">' + escHtml(title) + '</a>'
      +     '<span class="na-author">' + escHtml(author) + '</span>'
      +     subjectLine
      +     '<span class="na-isbn">ISBN: ' + escHtml(rawIsbn) + '</span>'
      +   '</div>'
      + '</div>'
      + '<div class="na-footer">'
      +   '<span class="na-date">Available: ' + escHtml(dateacc) + '</span>'
      +   '<div class="na-actions">' + authorBtn + subjectBtn + shareBtn + '</div>'
      + '</div>'
      + '</li>';
  }

  // -------- Auto-scroll loop (move-first-to-end) --------
  var state = { timer: null, paused: false };

  function startScrolling($track) {
    function step() {
      if (state.paused) return;
      var $first = $track.children().first();
      if (!$first.length) return;
      var height = $first.outerHeight(true);

      $track.css({
        'transition': 'transform ' + NA_CONFIG.transitionMs + 'ms ease-in-out',
        'transform': 'translateY(-' + height + 'px)'
      });

      setTimeout(function() {
        $track.css('transition', 'none');
        $first.appendTo($track);
        $track.css('transform', 'translateY(0)');
        $track[0].offsetHeight; // force reflow
      }, NA_CONFIG.transitionMs + 20);
    }
    state.timer = setInterval(step, NA_CONFIG.stepInterval);
  }

  // -------- Init --------
  $(document).ready(function() {
    var $scroller = $('#newArrivalsScroller');
    if (!$scroller.length) return;
    var $track = $scroller.find('.na-track');
    var $viewport = $scroller.find('.na-viewport');
    var $loading = $scroller.find('.na-loading');

    // Wire the spinner src from config
    $loading.find('.na-loading-img').attr('src', NA_CONFIG.spinnerUrl);

    // Pause on hover
    $scroller.on('mouseenter', function() { state.paused = true; })
             .on('mouseleave', function() { state.paused = false; });

    // Share button delegation
    $scroller.on('click', '.na-btn-share', function() {
      shareBiblio($(this).data('biblionumber'), $(this).data('title'));
    });

    // Navigation overlay on link clicks
    $scroller.on('click', 'a[href]', function(e) {
      // Skip Ctrl/Cmd/Shift/middle-click (new tab/window)
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.which === 2 || e.button === 1) {
        return;
      }
      var href = $(this).attr('href');
      if (!href || href === '#' || href.indexOf('javascript:') === 0) {
        return;
      }
      showNavOverlay();
    });

    // Clear overlay if user navigates back via bfcache
    $(window).on('pageshow', function() {
      hideNavOverlay();
    });

    // Fetch and render
    $.ajax({ url: REPORT_URL, dataType: 'json' })
      .done(function(data) {
        $loading.addClass('hidden');
        if (!data || !data.length) {
          $viewport.append('<div class="na-empty">No new arrivals to display.</div>');
          return;
        }
        var html = '';
        $.each(data, function(_, row) { html += buildRow(row); });
        $track.html(html);

        setTimeout(function() {
          var contentHeight = $track.outerHeight(true);
          var rowCount = $track.children().length;
          if (!rowCount) return;

          var avgRowHeight = contentHeight / rowCount;
          var maxVisible = Math.ceil(avgRowHeight * NA_CONFIG.visibleRows);
          var viewportHeight = Math.min(contentHeight, maxVisible);
          $viewport.css('height', viewportHeight + 'px');

          if (contentHeight > viewportHeight) {
            startScrolling($track);
          }
        }, 800);
      })
      .fail(function() {
        $loading.addClass('hidden');
        $viewport.append('<div class="na-empty">Could not load new arrivals.</div>');
      });
  });

})(jQuery);
