// Gère l'ouverture des projets et les galeries déclarées dans le HTML.
(() => {
  const cards = Array.from(document.querySelectorAll(".project"));
  const backdrop = document.querySelector(".projects__backdrop");
  const photoLightbox = document.querySelector(".photo-lightbox");
  const lightboxImage = photoLightbox?.querySelector(".photo-lightbox__image");
  const lightboxTitle = photoLightbox?.querySelector(".photo-lightbox__title");
  const previousPhotoButton = photoLightbox?.querySelector(
    ".photo-lightbox__navigation--previous",
  );
  const nextPhotoButton = photoLightbox?.querySelector(
    ".photo-lightbox__navigation--next",
  );

  if (
    !cards.length ||
    !backdrop ||
    !photoLightbox ||
    !lightboxImage ||
    !lightboxTitle ||
    !previousPhotoButton ||
    !nextPhotoButton
  ) {
    return;
  }

  let expandedCard = null;
  let zoomedImage = null;
  let lightboxImages = [];
  let zoomedImageIndex = 0;
  let projectReturnFocus = null;

  function showLightboxImage(index) {
    zoomedImageIndex = (index + lightboxImages.length) % lightboxImages.length;
    zoomedImage = lightboxImages[zoomedImageIndex];
    lightboxImage.src = zoomedImage.currentSrc || zoomedImage.src;
    lightboxImage.alt = zoomedImage.alt;
    const caption =
      zoomedImage.closest(".project__photo")?.querySelector("figcaption")?.textContent.trim() ||
      zoomedImage.alt ||
      "Photo du projet";
    lightboxTitle.textContent =
      `${caption} · ${zoomedImageIndex + 1} / ${lightboxImages.length}`;
  }

  // Ouvre une image dans la visionneuse commune à tous les projets.
  function openPhoto(image) {
    lightboxImages = Array.from(
      image.closest(".project").querySelectorAll(".project__images img"),
    );
    showLightboxImage(lightboxImages.indexOf(image));
    const hasMultipleImages = lightboxImages.length > 1;
    previousPhotoButton.hidden = !hasMultipleImages;
    nextPhotoButton.hidden = !hasMultipleImages;
    photoLightbox.showModal();
  }

  function navigateLightbox(direction) {
    if (lightboxImages.length > 1) {
      showLightboxImage(zoomedImageIndex + direction);
    }
  }

  function closePhoto() {
    if (photoLightbox.open) {
      photoLightbox.close();
    }
  }

  previousPhotoButton.addEventListener("click", () => navigateLightbox(-1));
  nextPhotoButton.addEventListener("click", () => navigateLightbox(1));
  photoLightbox.querySelector(".photo-lightbox__close").addEventListener("click", closePhoto);
  photoLightbox.addEventListener("click", (event) => {
    if (event.target === photoLightbox) {
      closePhoto();
    }
  });
  photoLightbox.addEventListener("close", () => {
    lightboxTitle.textContent = "";

    if (zoomedImage?.isConnected) {
      zoomedImage.focus({ preventScroll: true });
    }

    zoomedImage = null;
    lightboxImages = [];
    zoomedImageIndex = 0;
  });
  photoLightbox.addEventListener("cancel", (event) => {
    event.preventDefault();
    closePhoto();
  });
  photoLightbox.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateLightbox(-1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateLightbox(1);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closePhoto();
    }
  });

  // Masque le message vide dès qu'une balise image est ajoutée au projet.
  function updateGallery(card) {
    const images = Array.from(card.querySelectorAll(".project__images img"));
    const figures = Array.from(card.querySelectorAll(".project__photo"));
    const emptyMessage = card.querySelector(".project__gallery-empty");
    const imageList = card.querySelector(".project__images");
    const gallery = card.querySelector(".project__gallery");

    emptyMessage.hidden = images.length > 0;
    images.forEach((image) => {
      image.loading = "lazy";
      image.tabIndex = 0;
      image.setAttribute("role", "button");
      image.setAttribute("aria-haspopup", "dialog");
    });

    let controls = gallery.querySelector(".project__gallery-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.className = "project__gallery-controls";
      controls.innerHTML = `
        <button class="project__gallery-navigation" type="button" aria-label="Photo précédente">←</button>
        <span class="project__gallery-position" aria-live="polite"></span>
        <button class="project__gallery-navigation" type="button" aria-label="Photo suivante">→</button>
      `;
      gallery.append(controls);
      controls.querySelectorAll("button")[0].addEventListener("click", () => {
        showGalleryImage(card, -1);
      });
      controls.querySelectorAll("button")[1].addEventListener("click", () => {
        showGalleryImage(card, 1);
      });
    }

    controls.hidden = figures.length === 0;
    showGalleryImage(card, 0);
  }

  function showGalleryImage(card, direction) {
    const figures = Array.from(card.querySelectorAll(".project__photo"));
    if (!figures.length) {
      return;
    }

    const currentIndex = Number(card.dataset.galleryIndex || 0);
    const nextIndex =
      figures.length > 1
        ? (currentIndex + direction + figures.length) % figures.length
        : 0;
    setGalleryImage(card, nextIndex);
  }

  function setGalleryImage(card, nextIndex) {
    const figures = Array.from(card.querySelectorAll(".project__photo"));
    if (!figures.length) {
      return;
    }

    const controls = card.querySelector(".project__gallery-controls");
    const buttons = controls.querySelectorAll("button");
    const position = controls.querySelector(".project__gallery-position");
    const offsets =
      figures.length >= 5
        ? [-2, -1, 0, 1, 2]
        : figures.length > 2
          ? [-1, 0, 1]
          : [0, 1];
    const visibleFigures = new Map(
      offsets.map((offset, order) => [
        (nextIndex + offset + figures.length) % figures.length,
        { offset, order },
      ]),
    );

    card.dataset.galleryIndex = String(nextIndex);
    figures.forEach((figure, index) => {
      const visibleFigure = visibleFigures.get(index);
      const galleryPosition =
        visibleFigure?.offset === 0
          ? "current"
          : visibleFigure?.offset < 0
            ? `previous-${Math.abs(visibleFigure.offset)}`
            : visibleFigure
              ? `next-${visibleFigure.offset}`
              : "";

      figure.hidden = !galleryPosition;
      if (galleryPosition) {
        figure.dataset.galleryPosition = galleryPosition;
        figure.dataset.galleryOffset = String(visibleFigure.offset);
        figure.style.order = String(visibleFigure.order);
      } else {
        delete figure.dataset.galleryPosition;
        delete figure.dataset.galleryOffset;
        figure.style.order = "";
      }

      const image = figure.querySelector("img");
      const label = visibleFigure?.offset
        ? `Afficher la photo ${Math.abs(visibleFigure.offset)} ${
            visibleFigure.offset < 0 ? "précédente" : "suivante"
          }`
        : `Agrandir : ${image.alt}`;
      image.setAttribute("aria-label", `${label} — ${image.alt}`);
    });
    position.textContent = `${nextIndex + 1} / ${figures.length}`;
    buttons.forEach((button) => {
      button.disabled = figures.length < 2;
    });
  }

  function setProjectBackgroundInert(card, inert) {
    const projectsSection = card.closest(".projects");
    const main = projectsSection.closest("main");

    Array.from(main.children).forEach((section) => {
      if (section !== projectsSection) {
        section.inert = inert;
      }
    });
    projectsSection.querySelector(".projects__heading").inert = inert;
    cards.forEach((projectCard) => {
      if (projectCard !== card) {
        projectCard.inert = inert;
      }
    });
  }

  function closeProject(restoreFocus = false) {
    if (!expandedCard) {
      return;
    }

    const cardToClose = expandedCard;
    const focusTarget = projectReturnFocus;
    setProjectBackgroundInert(cardToClose, false);
    cardToClose.classList.remove("project--expanded");
    cardToClose.removeAttribute("role");
    cardToClose.removeAttribute("aria-modal");
    cardToClose.removeAttribute("aria-labelledby");
    cardToClose.removeAttribute("tabindex");
    cardToClose.querySelector(".project__open").setAttribute("aria-expanded", "false");
    if (focusTarget) {
      focusTarget.setAttribute("aria-expanded", "false");
    }
    expandedCard = null;
    projectReturnFocus = null;
    backdrop.hidden = true;
    document.body.classList.remove("page--project-open");

    if (restoreFocus && focusTarget?.isConnected) {
      focusTarget.focus({ preventScroll: true });
    }
  }

  // Une seule carte projet peut être agrandie à la fois.
  function toggleProject(card, trigger = card.querySelector(".project__open")) {
    if (expandedCard === card) {
      closeProject(true);
      return;
    }

    closeProject();
    expandedCard = card;
    projectReturnFocus = trigger;
    card.classList.add("project--expanded");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-labelledby", card.querySelector(".project__heading").id);
    card.tabIndex = -1;
    card.querySelector(".project__open").setAttribute("aria-expanded", "true");
    trigger.setAttribute("aria-expanded", "true");
    setProjectBackgroundInert(card, true);
    backdrop.hidden = false;
    document.body.classList.add("page--project-open");
    updateGallery(card);
    card.querySelector(".project__close").focus({ preventScroll: true });
  }

  cards.forEach((card) => {
    const imageList = card.querySelector(".project__images");

    card.querySelector(".project__open").addEventListener("click", (event) => {
      toggleProject(card, event.currentTarget);
    });
    card.querySelector(".project__close").addEventListener("click", () => {
      closeProject(true);
    });
    imageList.addEventListener("click", (event) => {
      const image = event.target.closest("img[role='button']");
      if (image) {
        const figure = image.closest(".project__photo");
        if (figure.dataset.galleryPosition !== "current") {
          showGalleryImage(card, Number(figure.dataset.galleryOffset));
        } else {
          openPhoto(image);
        }
      }
    });
    imageList.addEventListener("keydown", (event) => {
      const image = event.target.closest("img[role='button']");
      if (image && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        const figure = image.closest(".project__photo");
        if (figure.dataset.galleryPosition !== "current") {
          showGalleryImage(card, Number(figure.dataset.galleryOffset));
        } else {
          openPhoto(image);
        }
      }
    });
    updateGallery(card);

    card.addEventListener("keydown", (event) => {
      if (expandedCard !== card || event.key !== "Tab") {
        return;
      }

      const focusableElements = Array.from(
        card.querySelectorAll(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (element) =>
          !element.closest("[hidden], [inert]") && element.getClientRects().length > 0,
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement) {
        event.preventDefault();
        card.focus({ preventScroll: true });
      } else if (
        event.shiftKey &&
        (document.activeElement === firstElement || !card.contains(document.activeElement))
      ) {
        event.preventDefault();
        lastElement.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus({ preventScroll: true });
      }
    });
  });

  document.querySelectorAll(".skill-card__open").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.projectTarget;
      const targetCard = cards.find((card) => card.id === targetId);
      if (!targetCard) {
        return;
      }

      toggleProject(targetCard, button);
    });
  });

  backdrop.addEventListener("click", () => closeProject(true));

  document.addEventListener("keydown", (event) => {
    if (photoLightbox.open) {
      return;
    }

    if (event.key === "Escape" && expandedCard) {
      event.preventDefault();
      closeProject(true);
    }
  });
})();
