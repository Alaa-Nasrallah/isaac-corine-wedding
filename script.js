/* ============================================
   Isaac & Corine Wedding â Script
   ============================================ */

(function () {
  "use strict";

  // Wedding date: June 20, 2026, 6:00 PM (Lebanon time, UTC+3)
  const WEDDING_DATE = new Date("2026-06-20T18:00:00+03:00");

  /* ---------- DOM refs ---------- */
  const overlay      = document.getElementById("intro-overlay");
  const introVideo   = document.getElementById("intro-video");
  const introPrompt  = document.getElementById("intro-prompt");
  const mainContent  = document.getElementById("main-content");
  const mainNav      = document.getElementById("main-nav");
  const musicToggle  = document.getElementById("music-toggle");
  const musicIconOn  = document.getElementById("music-icon-on");
  const musicIconOff = document.getElementById("music-icon-off");
  const bgMusic      = document.getElementById("bg-music");
  const hamburger    = document.getElementById("nav-hamburger");
  const navLinks     = document.getElementById("nav-links");
  const heroVideo    = document.querySelector(".hero-gif");
  const heroPlayBtn  = document.getElementById("hero-play-btn");
  const heroWrapper  = document.getElementById("hero-gif-wrapper");

  function playHeroVideo() {
    if (!heroVideo || heroVideo.tagName !== "VIDEO") return;
    heroVideo.muted = true;
    heroVideo.setAttribute("muted", "");
    heroVideo.setAttribute("playsinline", "");
    var attempt = heroVideo.play();
    if (attempt && attempt.then) {
      attempt.then(function () {
        if (heroWrapper) heroWrapper.classList.add("is-playing");
      }).catch(function () {});
    } else if (heroWrapper) {
      heroWrapper.classList.add("is-playing");
    }
  }

  if (heroVideo) {
    heroVideo.load();
  }

  if (heroPlayBtn) {
    heroPlayBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      playHeroVideo();
    });
  }

  /* ---------- Intro overlay ---------- */
  let introState = "idle"; // idle | playing | fading
  var fadeInterval = null;

  // Gradually raise volume from 0 to 1.0 (system volume) over ~3 seconds
  function fadeInMusic() {
    if (fadeInterval) clearInterval(fadeInterval);
    fadeInterval = setInterval(function () {
      if (bgMusic.volume < 0.97) {
        bgMusic.volume = Math.min(bgMusic.volume + 0.02, 1.0);
      } else {
        bgMusic.volume = 1.0;
        clearInterval(fadeInterval);
        fadeInterval = null;
      }
    }, 60);
  }

  function handleIntroClick() {
    if (introState !== "idle") return;
    introState = "playing";
    if (introPrompt) introPrompt.style.display = "none";
    playHeroVideo();

    // Start music FIRST so the user-activation token is used for audio
    bgMusic.currentTime = 2;
    bgMusic.volume = 0;
    musicPlaying = true;
    musicIconOn.classList.remove("hidden");
    musicIconOff.classList.add("hidden");

    bgMusic.play().then(function () {
      fadeInMusic();
      // Play envelope video after music has started
      introVideo.play().catch(function () { revealMain(); });
    }).catch(function () {
      // If audio fails, still play the video
      introVideo.play().catch(function () { revealMain(); });
    });
  }

  function handleTimeUpdate() {
    if (!introVideo) return;
    var remaining = introVideo.duration - introVideo.currentTime;
    if (remaining <= 0.8 && introState === "playing") {
      introState = "fading";
      overlay.classList.add("fading");
      setTimeout(revealMain, 800);
    }
  }

  function handleVideoEnded() {
    if (introState !== "fading") revealMain();
  }

  overlay.addEventListener("click", handleIntroClick);
  introVideo.addEventListener("timeupdate", handleTimeUpdate);
  introVideo.addEventListener("ended", handleVideoEnded);

  function revealMain() {
    overlay.style.display = "none";
    mainContent.classList.remove("hidden");
    mainNav.classList.remove("hidden");
    musicToggle.classList.remove("hidden");
    playHeroVideo();

    // Smooth fade-in
    mainContent.classList.add("page-fade-in");
    mainNav.classList.add("page-fade-in");

    // Start countdown
    startCountdown();

    // Observe fade-in elements
    observeFadeIns();
  }

  /* ---------- Music toggle ---------- */
  let musicPlaying = false;

  musicToggle.addEventListener("click", function () {
    if (musicPlaying) {
      bgMusic.pause();
      musicIconOn.classList.add("hidden");
      musicIconOff.classList.remove("hidden");
      musicPlaying = false;
    } else {
      bgMusic.play().catch(function () {});
      musicIconOff.classList.add("hidden");
      musicIconOn.classList.remove("hidden");
      musicPlaying = true;
    }
  });

  // Stop music when leaving the page
  window.addEventListener("pagehide", function () {
    bgMusic.pause();
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      bgMusic.pause();
    } else if (musicPlaying) {
      bgMusic.play().catch(function () {});
    }
  });

  /* ---------- Navigation ---------- */
  // Hamburger
  hamburger.addEventListener("click", function () {
    hamburger.classList.toggle("open");
    navLinks.classList.toggle("open");
  });

  // Close mobile nav on link click & handle clicks while on discover page
  navLinks.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function (e) {
      hamburger.classList.remove("open");
      navLinks.classList.remove("open");

      var href = link.getAttribute("href");
      // If we're on the discover page and clicking a non-discover link,
      // switch back to main content first, then scroll to the target section.
      if (href !== "#discover" && discoverContent && !discoverContent.classList.contains("hidden")) {
        e.preventDefault();
        discoverContent.classList.add("page-leaving");
        setTimeout(function () {
          discoverContent.classList.add("hidden");
          discoverContent.classList.remove("page-leaving", "page-fade-in");
          mainContent.classList.remove("hidden");
          mainContent.classList.add("page-fade-in");
          // Scroll to the target section
          var target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: "smooth" });
          }
          navItems.forEach(function (a) { a.classList.remove("active"); });
          if (link) link.classList.add("active");
        }, 400);
      }
    });
  });

  // Active link on scroll
  const sections = document.querySelectorAll("section[id]");
  const navItems = navLinks.querySelectorAll("a");

  function updateActiveNav() {
    const scrollY = window.scrollY + 120;
    sections.forEach(function (section) {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute("id");
      if (scrollY >= top && scrollY < top + height) {
        navItems.forEach(function (a) {
          a.classList.remove("active");
          if (a.getAttribute("href") === "#" + id) a.classList.add("active");
        });
      }
    });
  }

  // Nav always visible â just update active link on scroll
  window.addEventListener("scroll", function () {
    updateActiveNav();
  }, { passive: true });

  /* ---------- Countdown ---------- */
  var countdownDone = false;

  function startCountdown() {
    var cdDays    = document.getElementById("cd-days");
    var cdHours   = document.getElementById("cd-hours");
    var cdMinutes = document.getElementById("cd-minutes");
    var cdSeconds = document.getElementById("cd-seconds");

    function update() {
      var now  = new Date();
      var diff = WEDDING_DATE - now;

      if (diff <= 0) {
        cdDays.textContent    = "0";
        cdHours.textContent   = "0";
        cdMinutes.textContent = "0";
        cdSeconds.textContent = "0";
        if (!countdownDone) {
          countdownDone = true;
          onCountdownComplete();
        }
        return;
      }

      var days    = Math.floor(diff / (1000 * 60 * 60 * 24));
      var hours   = Math.floor((diff / (1000 * 60 * 60)) % 24);
      var minutes = Math.floor((diff / (1000 * 60)) % 60);
      var seconds = Math.floor((diff / 1000) % 60);

      cdDays.textContent    = days;
      cdHours.textContent   = String(hours).padStart(2, "0");
      cdMinutes.textContent = String(minutes).padStart(2, "0");
      cdSeconds.textContent = String(seconds).padStart(2, "0");
    }

    update();
    setInterval(update, 1000);
  }

  /* ---------- Countdown complete â fireworks ---------- */
  function onCountdownComplete() {
    var subtitle = document.getElementById("countdown-subtitle");
    var celebration = document.getElementById("countdown-celebration");
    if (subtitle) subtitle.textContent = "The moment has arrived!";
    if (celebration) celebration.classList.remove("hidden");
    startFireworks();
  }

  /* ---------- Medieval Fireworks (canvas) ---------- */
  function startFireworks() {
    var canvas = document.getElementById("fireworks-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var section = document.getElementById("countdown");

    function resize() {
      canvas.width  = section.offsetWidth;
      canvas.height = section.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Wedding palette: 3-color scheme
    var colors = [
      [239, 223, 213],  // #efdfd5 cream
      [88, 112, 66],    // #587042 dark sage
      [169, 180, 148],  // #a9b494 sage
    ];

    var particles = [];
    var rockets   = [];
    var sparks    = [];

    function Rocket(x) {
      this.x  = x;
      this.y  = canvas.height;
      this.vx = (Math.random() - 0.5) * 1.5;
      this.vy = -(6 + Math.random() * 4);
      this.targetY = canvas.height * (0.15 + Math.random() * 0.35);
      this.trail = [];
      this.alive = true;
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    function Particle(x, y, color, speed, angle, life) {
      this.x     = x;
      this.y     = y;
      this.vx    = Math.cos(angle) * speed;
      this.vy    = Math.sin(angle) * speed;
      this.alpha = 1;
      this.life  = life || (60 + Math.random() * 40);
      this.decay = 1 / this.life;
      this.color = color;
      this.size  = 1.5 + Math.random() * 2;
      this.gravity = 0.025;
    }

    function Spark(x, y, color) {
      this.x     = x;
      this.y     = y;
      this.vx    = (Math.random() - 0.5) * 0.8;
      this.vy    = -Math.random() * 1.5;
      this.alpha = 0.8;
      this.life  = 30 + Math.random() * 20;
      this.decay = 1 / this.life;
      this.color = color;
      this.size  = 1 + Math.random();
    }

    function explode(x, y, color) {
      var count = 60 + Math.floor(Math.random() * 50);
      for (var i = 0; i < count; i++) {
        var angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.3;
        var speed = 1.5 + Math.random() * 3.5;
        var c = Math.random() > 0.3 ? color : colors[Math.floor(Math.random() * colors.length)];
        particles.push(new Particle(x, y, c, speed, angle));
      }
      // Inner burst â brighter, faster decay
      for (var j = 0; j < 20; j++) {
        var a2 = Math.random() * Math.PI * 2;
        var s2 = 0.5 + Math.random() * 1.5;
        particles.push(new Particle(x, y, [239, 223, 213], s2, a2, 25));
      }
    }

    function launchRocket() {
      var x = canvas.width * (0.15 + Math.random() * 0.7);
      rockets.push(new Rocket(x));
    }

    var frameId;
    var lastLaunch = 0;
    var launchInterval = 600; // ms between rockets

    function loop(ts) {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Semi-transparent layer for trails
      ctx.fillStyle = "rgba(239, 223, 213, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Launch rockets periodically
      if (ts - lastLaunch > launchInterval) {
        launchRocket();
        if (Math.random() > 0.5) launchRocket(); // occasional double
        lastLaunch = ts;
        launchInterval = 500 + Math.random() * 800;
      }

      ctx.globalCompositeOperation = "source-over";

      // Update & draw rockets
      for (var r = rockets.length - 1; r >= 0; r--) {
        var rk = rockets[r];
        rk.trail.push({ x: rk.x, y: rk.y });
        if (rk.trail.length > 8) rk.trail.shift();

        rk.x += rk.vx;
        rk.y += rk.vy;
        rk.vy *= 0.985;

        // Draw trail
        for (var t = 0; t < rk.trail.length; t++) {
          var ta = (t / rk.trail.length) * 0.6;
          ctx.fillStyle = "rgba(" + rk.color[0] + "," + rk.color[1] + "," + rk.color[2] + "," + ta + ")";
          ctx.beginPath();
          ctx.arc(rk.trail[t].x, rk.trail[t].y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw rocket head
        ctx.fillStyle = "rgba(255,240,200,0.9)";
        ctx.beginPath();
        ctx.arc(rk.x, rk.y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Rocket sparks
        if (Math.random() > 0.4) {
          sparks.push(new Spark(rk.x, rk.y, rk.color));
        }

        if (rk.y <= rk.targetY) {
          explode(rk.x, rk.y, rk.color);
          rockets.splice(r, 1);
        }
      }

      // Update & draw particles
      for (var p = particles.length - 1; p >= 0; p--) {
        var pt = particles[p];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += pt.gravity;
        pt.vx *= 0.99;
        pt.alpha -= pt.decay;

        if (pt.alpha <= 0) {
          particles.splice(p, 1);
          continue;
        }

        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = "rgb(" + pt.color[0] + "," + pt.color[1] + "," + pt.color[2] + ")";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * pt.alpha, 0, Math.PI * 2);
        ctx.fill();

        // Glowing effect
        ctx.globalAlpha = pt.alpha * 0.3;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * pt.alpha * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Update & draw sparks
      for (var s = sparks.length - 1; s >= 0; s--) {
        var sp = sparks[s];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vy += 0.03;
        sp.alpha -= sp.decay;

        if (sp.alpha <= 0) {
          sparks.splice(s, 1);
          continue;
        }

        ctx.globalAlpha = sp.alpha * 0.7;
        ctx.fillStyle = "rgb(" + sp.color[0] + "," + sp.color[1] + "," + sp.color[2] + ")";
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      frameId = requestAnimationFrame(loop);
    }

    // Only run fireworks when countdown section is in view
    var fireworksRunning = false;
    var countdownSection = document.getElementById("countdown");

    var fireworksObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !fireworksRunning) {
          fireworksRunning = true;
          resize();
          frameId = requestAnimationFrame(loop);
        } else if (!entry.isIntersecting && fireworksRunning) {
          fireworksRunning = false;
          cancelAnimationFrame(frameId);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });
    }, { threshold: 0.1 });

    fireworksObserver.observe(countdownSection);
  }

  /* ---------- Fade-in on scroll ---------- */
  function observeFadeIns() {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          } else {
            entry.target.classList.remove("visible");
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll("#main-content .fade-in").forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ---------- Discover page toggle (in-page, keeps music playing) ---------- */
  var discoverContent = document.getElementById("discover-content");
  var backBtn = document.getElementById("back-to-wedding");

  function showDiscover(e) {
    if (e) e.preventDefault();
    mainContent.classList.add("page-leaving");
    setTimeout(function () {
      mainContent.classList.add("hidden");
      mainContent.classList.remove("page-leaving");
      discoverContent.classList.remove("hidden");
      discoverContent.classList.add("page-fade-in");
      window.scrollTo({ top: 0, behavior: "instant" });
      setTimeout(function () { window.scrollTo({ top: 0, behavior: "instant" }); }, 10);
      // Update active nav
      navItems.forEach(function (a) { a.classList.remove("active"); });
      var discoverLink = navLinks.querySelector('a[href="#discover"]');
      if (discoverLink) discoverLink.classList.add("active");
      // Observe fade-ins in discover
      discoverContent.querySelectorAll(".fade-in").forEach(function (el) {
        el.classList.remove("visible");
      });
      var discoverObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          } else {
            entry.target.classList.remove("visible");
          }
        });
      }, { threshold: 0.1 });
      discoverContent.querySelectorAll(".fade-in").forEach(function (el) {
        discoverObserver.observe(el);
      });
    }, 400);
  }

  function showMain(e) {
    if (e) e.preventDefault();
    discoverContent.classList.add("page-leaving");
    setTimeout(function () {
      discoverContent.classList.add("hidden");
      discoverContent.classList.remove("page-leaving", "page-fade-in");
      mainContent.classList.remove("hidden");
      mainContent.classList.add("page-fade-in");
      // Scroll to the Discover Lebanon CTA block
      setTimeout(function () {
        var discoverCTA = document.getElementById("discover-cta");
        if (discoverCTA) {
          discoverCTA.scrollIntoView({ behavior: "instant", block: "center" });
        }
      }, 50);
      // Update active nav
      navItems.forEach(function (a) { a.classList.remove("active"); });
      var discoverLink = navLinks.querySelector('a[href="#discover"]');
      if (discoverLink) discoverLink.classList.add("active");
    }, 400);
  }

  // Discover links
  document.querySelectorAll('a[href="#discover"]').forEach(function (link) {
    link.addEventListener("click", showDiscover);
  });

  // Back to wedding
  if (backBtn) backBtn.addEventListener("click", showMain);

  /* ---------- Accordion ---------- */
  document.querySelectorAll(".accordion-trigger").forEach(function (trigger) {
    trigger.addEventListener("click", function () {
      const item = trigger.closest(".accordion-item");
      const isOpen = item.classList.contains("open");

      // Close siblings in same accordion
      const accordion = trigger.closest(".accordion");
      if (accordion) {
        accordion.querySelectorAll(".accordion-item.open").forEach(function (openItem) {
          openItem.classList.remove("open");
        });
      }

      if (!isOpen) item.classList.add("open");
    });
  });

  /* ---------- Gift reveal buttons ---------- */
  document.querySelectorAll(".gift-reveal-btn").forEach(function (btn) {
    var targetId = btn.getAttribute("data-gift-target");
    var details  = targetId ? document.getElementById(targetId) : null;
    if (!details) return;
    btn.addEventListener("click", function () {
      btn.classList.add("fade-out");
      setTimeout(function () {
        btn.style.display = "none";
        details.classList.remove("gift-details-hidden");
        details.classList.add("gift-details-visible");
      }, 400);
    });
  });

  /* ---------- Radio card selection ---------- */
  function initRadioSelections(container) {
    container.querySelectorAll(".radio-group").forEach(function (group) {
      group.querySelectorAll(".radio-label").forEach(function (label) {
        var radio = label.querySelector('input[type="radio"]');
        if (!radio) return;
        radio.addEventListener("change", function () {
          // Only clear selections within the same radio group
          group.querySelectorAll(".radio-label").forEach(function (l) {
            l.classList.remove("selected");
          });
          label.classList.add("selected");
        });
      });
    });
  }
  // Initialize for any radio groups already in the DOM
  initRadioSelections(document);

  /* ---------- Preload confetti GIF ---------- */
  var confettiPreload = new Image();
  confettiPreload.src = "./assets/confetti-CrGrT4ka.gif";

  /* ---------- RSVP â Guest Lookup & Confirm ---------- */
  var rsvpLookup       = document.getElementById("rsvp-lookup");
  var rsvpSearch       = document.getElementById("rsvp-search");
  var rsvpFindBtn      = document.getElementById("rsvp-find-btn");
  var rsvpLookupErr    = document.getElementById("rsvp-lookup-error");
  var rsvpConfirm      = document.getElementById("rsvp-confirm");
  var rsvpGuestName    = document.getElementById("rsvp-guest-name");
  var rsvpSubmitBtn    = document.getElementById("rsvp-submit-btn");
  var rsvpSuccess      = document.getElementById("rsvp-success");
  var rsvpMessage      = document.getElementById("rsvp-success-message");
  var rsvpBackBtn      = document.getElementById("rsvp-back-btn");
  var rsvpAlreadySubmitted = document.getElementById("rsvp-already-submitted");
  var rsvpAlreadyBackBtn   = document.getElementById("rsvp-already-back-btn");
  var rsvpAlreadyGuestName = document.getElementById("rsvp-already-guest-name");
  var rsvpPreweddingSec    = document.getElementById("rsvp-prewedding-section");
  var rsvpPlusoneNameInput = document.getElementById("rsvp-plusone-name");
  var rsvpPreweddingNotice = document.getElementById("rsvp-prewedding-notice");
  var rsvpPrewedGuestName  = document.getElementById("rsvp-prewed-guest-name");
  var rsvpWedGuestName     = document.getElementById("rsvp-wed-guest-name");
  var rsvpPrewedPlusoneRow = document.getElementById("rsvp-prewed-plusone-row");
  var rsvpWedPlusoneRow    = document.getElementById("rsvp-wed-plusone-row");
  var rsvpPrewedPlusoneNameInput = document.getElementById("rsvp-prewed-plusone-name");

  var currentGuest = null;

  // Clear error on plus-one name when typing
  if (rsvpPlusoneNameInput) {
    rsvpPlusoneNameInput.addEventListener("input", function () {
      rsvpPlusoneNameInput.classList.remove("input-error");
    });
  }
  if (rsvpPrewedPlusoneNameInput) {
    rsvpPrewedPlusoneNameInput.addEventListener("input", function () {
      rsvpPrewedPlusoneNameInput.classList.remove("input-error");
    });
  }

  // Reset form to initial state
  function resetRsvpForm() {
    // Clear radio selections
    rsvpConfirm.querySelectorAll('input[type="radio"]').forEach(function (r) {
      r.checked = false;
    });
    rsvpConfirm.querySelectorAll(".radio-label").forEach(function (l) {
      l.classList.remove("selected");
    });
    // Clear plus-one names
    if (rsvpPlusoneNameInput) {
      rsvpPlusoneNameInput.value = "";
      rsvpPlusoneNameInput.classList.remove("input-error");
    }
    if (rsvpPrewedPlusoneNameInput) {
      rsvpPrewedPlusoneNameInput.value = "";
      rsvpPrewedPlusoneNameInput.classList.remove("input-error");
    }
    // Hide conditional sections
    rsvpPreweddingSec.classList.add("hidden");
    rsvpPreweddingNotice.classList.add("hidden");
    rsvpWedPlusoneRow.classList.add("hidden");
    rsvpPrewedPlusoneRow.classList.add("hidden");
    // Reset button
    rsvpSubmitBtn.disabled = false;
    rsvpSubmitBtn.textContent = "Send Confirmation";
    rsvpFindBtn.disabled = false;
    rsvpFindBtn.textContent = "Find Your Invitation";
    currentGuest = null;
  }

  // Back button handler
  function goBackToLookup() {
    rsvpConfirm.classList.add("hidden");
    rsvpAlreadySubmitted.classList.add("hidden");
    rsvpLookup.classList.remove("hidden");
    resetRsvpForm();
  }

  if (rsvpBackBtn) rsvpBackBtn.addEventListener("click", goBackToLookup);
  if (rsvpAlreadyBackBtn) rsvpAlreadyBackBtn.addEventListener("click", goBackToLookup);

  // Allow pressing Enter in the search field
  if (rsvpSearch) {
    rsvpSearch.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        rsvpFindBtn.click();
      }
    });
  }

  // Step 1: Find invitation
  if (rsvpFindBtn) {
    rsvpFindBtn.addEventListener("click", function () {
      var name = rsvpSearch.value.trim();
      if (!name) {
        rsvpLookupErr.textContent = "Please enter your name.";
        rsvpLookupErr.classList.remove("hidden");
        return;
      }

      rsvpFindBtn.disabled = true;
      rsvpFindBtn.textContent = "Searching...";
      rsvpLookupErr.classList.add("hidden");

      fetch("/api/token")
        .then(function (res) { return res.json(); })
        .then(function (data) {
          return fetch("/api/guest-lookup", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-RSVP-Token": data.token
            },
            body: JSON.stringify({ name: name })
          });
        })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.error) {
            rsvpLookupErr.textContent = data.error;
            rsvpLookupErr.classList.remove("hidden");
            rsvpFindBtn.disabled = false;
            rsvpFindBtn.textContent = "Find Your Invitation";
            return;
          }

          if (!data.guest) {
            rsvpLookupErr.textContent = "We couldn\u2019t find your name on the guest list. Please check the spelling or contact us directly.";
            rsvpLookupErr.classList.remove("hidden");
            rsvpFindBtn.disabled = false;
            rsvpFindBtn.textContent = "Find Your Invitation";
            return;
          }

          // Guest found
          currentGuest = data.guest;

          // Check if already submitted
          if (data.guest.already_submitted) {
            rsvpAlreadyGuestName.textContent = data.guest.name;
            rsvpLookup.classList.add("hidden");
            rsvpAlreadySubmitted.classList.remove("hidden");
            rsvpAlreadySubmitted.querySelectorAll(".fade-in").forEach(function (el) {
              el.classList.add("visible");
            });
            return;
          }

          // Show RSVP form
          rsvpGuestName.textContent = data.guest.name;
          rsvpWedGuestName.textContent = data.guest.name;

          // Show/hide pre-wedding section
          if (data.guest.prewedding) {
            rsvpPreweddingNotice.classList.remove("hidden");
            rsvpPreweddingSec.classList.remove("hidden");
            rsvpPrewedGuestName.textContent = data.guest.name;
            // Show plus-one row in pre-wedding if guest has +1
            if (data.guest.plus_one) {
              rsvpPrewedPlusoneRow.classList.remove("hidden");
            } else {
              rsvpPrewedPlusoneRow.classList.add("hidden");
            }
          } else {
            rsvpPreweddingNotice.classList.add("hidden");
            rsvpPreweddingSec.classList.add("hidden");
          }

          // Show/hide plus-one row in wedding section
          if (data.guest.plus_one) {
            rsvpWedPlusoneRow.classList.remove("hidden");
          } else {
            rsvpWedPlusoneRow.classList.add("hidden");
          }

          // Pre-fill plus-one name inputs if a name is defined in the database
          if (data.guest.plus_one_name) {
            if (rsvpPlusoneNameInput) {
              rsvpPlusoneNameInput.value = data.guest.plus_one_name;
            }
            if (rsvpPrewedPlusoneNameInput) {
              rsvpPrewedPlusoneNameInput.value = data.guest.plus_one_name;
            }
          }

          rsvpLookup.classList.add("hidden");
          rsvpConfirm.classList.remove("hidden");

          // Re-initialize radio selections for the newly shown form
          initRadioSelections(rsvpConfirm);

          // Re-observe fade-ins inside the confirm card
          rsvpConfirm.querySelectorAll(".fade-in").forEach(function (el) {
            el.classList.add("visible");
          });
        })
        .catch(function () {
          rsvpLookupErr.textContent = "Something went wrong. Please try again.";
          rsvpLookupErr.classList.remove("hidden");
          rsvpFindBtn.disabled = false;
          rsvpFindBtn.textContent = "Find Your Invitation";
        });
    });
  }

  // Step 2: Submit attendance
  if (rsvpSubmitBtn) {
    rsvpSubmitBtn.addEventListener("click", function () {
      // Validate wedding attendance
      var attending = document.querySelector('#rsvp-confirm input[name="attending"]:checked');
      if (!attending) return;

      // Validate pre-wedding selection if visible
      if (currentGuest.prewedding) {
        var prewedding = document.querySelector('#rsvp-confirm input[name="prewedding_attending"]:checked');
        if (!prewedding) return;
      }

      // Validate plus-one selections if visible
      if (currentGuest.plus_one) {
        var plusOneAttending = document.querySelector('#rsvp-confirm input[name="plus_one_attending"]:checked');
        if (!plusOneAttending) return;
        if (plusOneAttending.value === "yes") {
          var plusOneName = rsvpPlusoneNameInput ? rsvpPlusoneNameInput.value.trim() : "";
          if (!plusOneName) {
            rsvpPlusoneNameInput.focus();
            rsvpPlusoneNameInput.classList.add("input-error");
            return;
          }
        }
        if (currentGuest.prewedding) {
          var plusOnePrewedding = document.querySelector('#rsvp-confirm input[name="plus_one_prewedding_attending"]:checked');
          if (!plusOnePrewedding) return;
          // Validate pre-wedding plus-one name if attending
          if (plusOnePrewedding.value === "yes") {
            var prewedPlusOneName = rsvpPrewedPlusoneNameInput ? rsvpPrewedPlusoneNameInput.value.trim() : "";
            if (!prewedPlusOneName) {
              rsvpPrewedPlusoneNameInput.focus();
              rsvpPrewedPlusoneNameInput.classList.add("input-error");
              return;
            }
          }
        }
      }

      var isAttending = attending.value === "yes";

      rsvpSubmitBtn.disabled = true;
      rsvpSubmitBtn.textContent = "Sending...";

      // Build submission data
      var submitData = {
        guest_id: currentGuest.id,
        name: currentGuest.name,
        attending: attending.value
      };

      // Pre-wedding
      if (currentGuest.prewedding) {
        submitData.prewedding_attending = document.querySelector('#rsvp-confirm input[name="prewedding_attending"]:checked').value;
      }

      // Plus-one â use the wedding plus-one name as primary
      if (currentGuest.plus_one) {
        submitData.plus_one_name = rsvpPlusoneNameInput ? rsvpPlusoneNameInput.value.trim() : "";
        submitData.plus_one_attending = document.querySelector('#rsvp-confirm input[name="plus_one_attending"]:checked').value;
        if (currentGuest.prewedding) {
          submitData.plus_one_prewedding_attending = document.querySelector('#rsvp-confirm input[name="plus_one_prewedding_attending"]:checked').value;
        }
      }

      fetch("/api/token")
        .then(function (res) { return res.json(); })
        .then(function (data) {
          return fetch("/api/send-rsvp", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-RSVP-Token": data.token
            },
            body: JSON.stringify(submitData)
          });
        })
        .then(function (res) {
          if (!res.ok) throw new Error("Server error");
          return res.json();
        })
        .then(function () {
          rsvpConfirm.classList.add("hidden");
          rsvpSuccess.classList.remove("hidden");

          if (isAttending) {
            rsvpMessage.textContent = "We can\u2019t wait to celebrate with you, " + currentGuest.name + "!";
          } else {
            rsvpMessage.textContent = "We\u2019ll miss you, " + currentGuest.name + ". Thank you for letting us know.";
          }
        })
        .catch(function () {
          rsvpSubmitBtn.disabled = false;
          rsvpSubmitBtn.textContent = "Send Confirmation";
          alert("Something went wrong. Please try again.");
        });
    });
  }

})();
