"use strict";

/*
  ============================================================
  DEVFOLIO BUILDER
  Vanilla JavaScript Portfolio Builder
  ============================================================
*/

const STORAGE_KEY = "devfolio-builder-data";

/* ============================================================
   HELPERS
============================================================ */

const $ = (selector, parent = document) => parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  [...parent.querySelectorAll(selector)];

const createId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const escapeHTML = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const isValidEmail = email =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const isValidURL = value => {
  if (!value || !value.trim()) return true;

  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const safeURL = value => {
  if (!value || !isValidURL(value)) return "#";

  try {
    const url = new URL(value.trim());

    if (!["http:", "https:"].includes(url.protocol)) {
      return "#";
    }

    return url.href;
  } catch {
    return "#";
  }
};

/* ============================================================
   IMAGE HELPERS
============================================================ */

const DEFAULT_PROFILE_PHOTO =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80";

const isImageSource = value => {
  if (!value || typeof value !== "string") return false;

  const source = value.trim();

  // Uploaded image stored as a data URL.
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(source)) {
    return true;
  }

  // Optional remote image URL.
  try {
    const url = new URL(source);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const readImageAsDataURL = (file, maxSize = 1200, quality = 0.85) =>
  new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Please select a valid image file."));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () =>
      reject(new Error("The image could not be read."));

    reader.onload = event => {
      const image = new Image();

      image.onerror = () =>
        reject(new Error("The selected image is invalid."));

      image.onload = () => {
        let { width, height } = image;

        // Resize large photos so localStorage does not fill up quickly.
        if (width > maxSize || height > maxSize) {
          const scale = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      image.src = event.target.result;
    };

    reader.readAsDataURL(file);
  });

const debounce = (callback, delay = 250) => {
  let timeout;

  return (...args) => {
    clearTimeout(timeout);

    timeout = setTimeout(() => {
      callback(...args);
    }, delay);
  };
};

/* ============================================================
   DEFAULT STATE
============================================================ */

const createDefaultState = () => ({
  personal: {
    fullName: "",
    professionalTitle: "",
    profilePhoto: "",
    email: "",
    phone: "",
    location: "",
    shortBio: "",
    aboutMe: ""
  },

  social: {
    github: "",
    linkedin: "",
    twitter: "",
    website: ""
  },

  contact: {
    email: "",
    phone: "",
    location: ""
  },

  skills: [],

  experience: [],

  education: [],

  projects: [],

  customization: {
    theme: "light",
    accentColor: "#6366f1",
    font: "Inter",
    layout: "modern"
  }
});

let state = createDefaultState();

let modalType = null;
let editingId = null;

/* ============================================================
   DOM REFERENCES
============================================================ */

const fullNameInput = $("#fullName");
const professionalTitleInput = $("#professionalTitle");
const profilePhotoInput = $("#profilePhoto");
const emailInput = $("#email");
const phoneInput = $("#phone");
const locationInput = $("#location");
const shortBioInput = $("#shortBio");
const aboutMeInput = $("#aboutMe");

const githubInput = $("#github");
const linkedinInput = $("#linkedin");
const twitterInput = $("#twitter");
const websiteInput = $("#website");

const contactEmailInput = $("#contactEmail");
const contactPhoneInput = $("#contactPhone");
const contactLocationInput = $("#contactLocation");

const skillInput = $("#skillInput");
const skillsContainer = $("#skillsContainer");

const experienceEditor = $("#experienceEditor");
const educationEditor = $("#educationEditor");
const projectsEditor = $("#projectsEditor");

const layoutSelect = $("#layoutSelect");
const fontSelect = $("#fontSelect");
const accentColorInput = $("#accentColor");
const accentColorValue = $("#accentColorValue");

const previewName = $("#previewName");
const previewTitle = $("#previewTitle");
const previewPhoto = $("#previewPhoto");
const previewShortBio = $("#previewShortBio");
const previewAbout = $("#previewAbout");
const previewSocials = $("#previewSocials");
const previewSkills = $("#previewSkills");
const previewExperience = $("#previewExperience");
const previewEducation = $("#previewEducation");
const previewProjects = $("#previewProjects");
const previewContact = $("#previewContact");
const previewContactSocials = $("#previewContactSocials");
const previewFooterName = $("#previewFooterName");

const portfolioPreview = $("#portfolioPreview");

const entryModal = $("#entryModal");
const entryForm = $("#entryForm");
const modalTitle = $("#modalTitle");
const modalClose = $("#modalClose");
const cancelModal = $("#cancelModal");

const experienceFields = $("#experienceFields");
const educationFields = $("#educationFields");
const projectFields = $("#projectFields");

const toastContainer = $("#toastContainer");

/* ============================================================
   STORAGE
============================================================ */

const saveToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("Could not save portfolio:", error);
    showToast("Unable to save portfolio.", "error");
    return false;
  }
};

const loadFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return false;
    }

    const parsed = JSON.parse(saved);

    state = {
      ...createDefaultState(),
      ...parsed,

      personal: {
        ...createDefaultState().personal,
        ...(parsed.personal || {})
      },

      social: {
        ...createDefaultState().social,
        ...(parsed.social || {})
      },

      contact: {
        ...createDefaultState().contact,
        ...(parsed.contact || {})
      },

      customization: {
        ...createDefaultState().customization,
        ...(parsed.customization || {})
      },

      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      education: Array.isArray(parsed.education) ? parsed.education : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : []
    };

    return true;
  } catch (error) {
    console.error("Could not load portfolio:", error);
    state = createDefaultState();
    return false;
  }
};

/* ============================================================
   TOAST NOTIFICATIONS
============================================================ */

const showToast = (message, type = "success") => {
  const toast = document.createElement("div");

  toast.className = `toast ${type === "error" ? "error" : ""}`;

  const icon =
    type === "error"
      ? "fa-circle-exclamation"
      : "fa-circle-check";

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${escapeHTML(message)}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3600);
};

/* ============================================================
   STATE <-> FORM
============================================================ */

const getInputState = () => {
  state.personal.fullName = fullNameInput.value.trim();
  state.personal.professionalTitle = professionalTitleInput.value.trim();
  // profilePhoto is managed by the file-upload handler below.
  // Never read input[type="file"].value as an image URL.
  state.personal.email = emailInput.value.trim();
  state.personal.phone = phoneInput.value.trim();
  state.personal.location = locationInput.value.trim();
  state.personal.shortBio = shortBioInput.value.trim();
  state.personal.aboutMe = aboutMeInput.value.trim();

  state.social.github = githubInput.value.trim();
  state.social.linkedin = linkedinInput.value.trim();
  state.social.twitter = twitterInput.value.trim();
  state.social.website = websiteInput.value.trim();

  state.contact.email = contactEmailInput.value.trim();
  state.contact.phone = contactPhoneInput.value.trim();
  state.contact.location = contactLocationInput.value.trim();

  state.customization.layout = layoutSelect.value;
  state.customization.font = fontSelect.value;
  state.customization.accentColor = accentColorInput.value;
};

const populateForm = () => {
  fullNameInput.value = state.personal.fullName;
  professionalTitleInput.value = state.personal.professionalTitle;
  // Browsers do not allow setting a file input to a local path.
  profilePhotoInput.value = "";
  emailInput.value = state.personal.email;
  phoneInput.value = state.personal.phone;
  locationInput.value = state.personal.location;
  shortBioInput.value = state.personal.shortBio;
  aboutMeInput.value = state.personal.aboutMe;

  githubInput.value = state.social.github;
  linkedinInput.value = state.social.linkedin;
  twitterInput.value = state.social.twitter;
  websiteInput.value = state.social.website;

  contactEmailInput.value = state.contact.email;
  contactPhoneInput.value = state.contact.phone;
  contactLocationInput.value = state.contact.location;

  layoutSelect.value = state.customization.layout;
  fontSelect.value = state.customization.font;
  accentColorInput.value = state.customization.accentColor;

  accentColorValue.textContent =
    state.customization.accentColor.toUpperCase();

  applyTheme(state.customization.theme);
  applyCustomization();
};

/* ============================================================
   VALIDATION
============================================================ */

const clearValidation = () => {
  $$(".error-message").forEach(element => {
    element.textContent = "";
  });

  $$(".form-group input, .form-group textarea").forEach(element => {
    element.classList.remove("input-error");
  });
};

const setFieldError = (field, message) => {
  const error = $(`[data-error="${field}"]`);

  if (error) {
    error.textContent = message;
  }

  const input = document.getElementById(field);

  if (input) {
    input.classList.add("input-error");
  }
};

const validatePortfolio = () => {
  clearValidation();

  let valid = true;

  if (!state.personal.fullName) {
    setFieldError("fullName", "Full name is required.");
    valid = false;
  }

  if (!state.personal.professionalTitle) {
    setFieldError(
      "professionalTitle",
      "Professional title is required."
    );
    valid = false;
  }

  if (
    state.personal.email &&
    !isValidEmail(state.personal.email)
  ) {
    setFieldError(
      "email",
      "Please enter a valid email address."
    );
    valid = false;
  }

  const urlFields = [
    ["github", state.social.github],
    ["linkedin", state.social.linkedin],
    ["twitter", state.social.twitter],
    ["website", state.social.website]
  ];

  urlFields.forEach(([field, value]) => {
    if (value && !isValidURL(value)) {
      setFieldError(field, "Please enter a valid URL.");
      valid = false;
    }
  });

  if (
    state.contact.email &&
    !isValidEmail(state.contact.email)
  ) {
    showToast("Contact email is invalid.", "error");
    valid = false;
  }

  return valid;
};

/* ============================================================
   CUSTOMIZATION
============================================================ */

const applyCustomization = () => {
  const accent =
    state.customization.accentColor || "#6366f1";

  document.documentElement.style.setProperty(
    "--accent",
    accent
  );

  const darkerAccent = adjustColor(accent, -18);

  document.documentElement.style.setProperty(
    "--accent-dark",
    darkerAccent
  );

  document.documentElement.style.setProperty(
    "--font",
    `"${state.customization.font}", sans-serif`
  );

  portfolioPreview.classList.remove(
    "layout-modern",
    "layout-minimal",
    "layout-professional"
  );

  portfolioPreview.classList.add(
    `layout-${state.customization.layout}`
  );

  portfolioPreview.classList.toggle(
    "dark",
    state.customization.theme === "dark"
  );

  accentColorValue.textContent = accent.toUpperCase();
};

const adjustColor = (hex, amount) => {
  let color = hex.replace("#", "");

  if (color.length === 3) {
    color = color
      .split("")
      .map(char => char + char)
      .join("");
  }

  const num = parseInt(color, 16);

  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;

  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  return `#${(b | (g << 8) | (r << 16))
    .toString(16)
    .padStart(6, "0")}`;
};

/* ============================================================
   THEME
============================================================ */

const applyTheme = theme => {
  state.customization.theme = theme;

  document.body.classList.toggle(
    "dark-mode",
    theme === "dark"
  );

  portfolioPreview.classList.toggle(
    "dark",
    theme === "dark"
  );

  $$(".theme-option").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.theme === theme
    );
  });

  const icon = $("#themeToggle i");

  if (icon) {
    icon.className =
      theme === "dark"
        ? "fa-solid fa-sun"
        : "fa-solid fa-moon";
  }
};

/* ============================================================
   PREVIEW SOCIALS
============================================================ */

const getSocialIcon = type => {
  const icons = {
    github: "fa-brands fa-github",
    linkedin: "fa-brands fa-linkedin",
    twitter: "fa-brands fa-x-twitter",
    website: "fa-solid fa-globe"
  };

  return icons[type];
};

const getSocialLabel = type => {
  const labels = {
    github: "GitHub",
    linkedin: "LinkedIn",
    twitter: "Twitter / X",
    website: "Website"
  };

  return labels[type];
};

const renderSocialLinks = () => {
  const links = Object.entries(state.social)
    .filter(([, url]) => url && isValidURL(url))
    .map(([type, url]) => `
      <a
        href="${escapeHTML(safeURL(url))}"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="${getSocialLabel(type)}"
        title="${getSocialLabel(type)}"
      >
        <i class="${getSocialIcon(type)}"></i>
      </a>
    `)
    .join("");

  previewSocials.innerHTML =
    links ||
    `
      <span class="portfolio-empty-social">
        Add your social links
      </span>
    `;

  previewContactSocials.innerHTML = links;
};

/* ============================================================
   SKILLS
============================================================ */

const renderSkillsEditor = () => {
  if (!state.skills.length) {
    skillsContainer.innerHTML = `
      <div class="empty-state small">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
        <span>No skills added yet.</span>
      </div>
    `;

    return;
  }

  skillsContainer.innerHTML = state.skills
    .map((skill, index) => `
      <div class="skill-tag">
        <span>${escapeHTML(skill)}</span>

        <button
          type="button"
          class="remove-skill"
          data-index="${index}"
          title="Remove skill"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `)
    .join("");
};

const renderSkillsPreview = () => {
  if (!state.skills.length) {
    previewSkills.innerHTML = `
      <div class="portfolio-empty">
        Skills will appear here when you add them.
      </div>
    `;

    return;
  }

  previewSkills.innerHTML = state.skills
    .map(skill => `
      <span class="portfolio-skill">
        ${escapeHTML(skill)}
      </span>
    `)
    .join("");
};

const addSkill = () => {
  const skill = skillInput.value.trim();

  if (!skill) {
    showToast("Please enter a skill.", "error");
    skillInput.focus();
    return;
  }

  const exists = state.skills.some(
    existing =>
      existing.toLowerCase() === skill.toLowerCase()
  );

  if (exists) {
    showToast("This skill already exists.", "error");
    return;
  }

  state.skills.push(skill);

  skillInput.value = "";

  renderSkillsEditor();
  renderSkillsPreview();
  saveToStorage();

  showToast("Skill added.");
};

const removeSkill = index => {
  state.skills.splice(index, 1);

  renderSkillsEditor();
  renderSkillsPreview();
  saveToStorage();
};

/* ============================================================
   EXPERIENCE
============================================================ */

const renderExperienceEditor = () => {
  if (!state.experience.length) {
    experienceEditor.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-briefcase"></i>
        <strong>No experience added</strong>
        <span>Add your first professional experience.</span>
      </div>
    `;

    return;
  }

  experienceEditor.innerHTML = state.experience
    .map(entry => `
      <div class="entry-card">

        <div class="entry-card-content">
          <h4>${escapeHTML(entry.jobTitle)}</h4>
          <p>
            ${escapeHTML(entry.company)}
            ${entry.start ? ` · ${escapeHTML(entry.start)}` : ""}
            ${entry.end ? ` - ${escapeHTML(entry.end)}` : ""}
          </p>
        </div>

        <div class="entry-actions">

          <button
            type="button"
            data-action="edit-experience"
            data-id="${entry.id}"
            title="Edit"
          >
            <i class="fa-solid fa-pen"></i>
          </button>

          <button
            type="button"
            class="delete"
            data-action="delete-experience"
            data-id="${entry.id}"
            title="Delete"
          >
            <i class="fa-solid fa-trash"></i>
          </button>

        </div>

      </div>
    `)
    .join("");
};

const renderExperiencePreview = () => {
  if (!state.experience.length) {
    previewExperience.innerHTML = `
      <div class="portfolio-empty">
        No professional experience added yet.
      </div>
    `;

    return;
  }

  previewExperience.innerHTML = state.experience
    .map(entry => {

      const date =
        entry.start || entry.end
          ? `${escapeHTML(entry.start || "")}${entry.end ? ` - ${escapeHTML(entry.end)}` : ""}`
          : "";

      return `
        <article class="timeline-item">

          ${
            date
              ? `<div class="timeline-date">${date}</div>`
              : ""
          }

          <h3>${escapeHTML(entry.jobTitle)}</h3>

          <div class="timeline-company">
            ${escapeHTML(entry.company)}
          </div>

          ${
            entry.description
              ? `<p>${escapeHTML(entry.description)}</p>`
              : ""
          }

        </article>
      `;
    })
    .join("");
};

/* ============================================================
   EDUCATION
============================================================ */

const renderEducationEditor = () => {
  if (!state.education.length) {
    educationEditor.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-graduation-cap"></i>
        <strong>No education added</strong>
        <span>Add your academic qualification.</span>
      </div>
    `;

    return;
  }

  educationEditor.innerHTML = state.education
    .map(entry => `
      <div class="entry-card">

        <div class="entry-card-content">
          <h4>${escapeHTML(entry.degree)}</h4>
          <p>
            ${escapeHTML(entry.institution)}
            ${entry.start ? ` · ${escapeHTML(entry.start)}` : ""}
            ${entry.end ? ` - ${escapeHTML(entry.end)}` : ""}
          </p>
        </div>

        <div class="entry-actions">

          <button
            type="button"
            data-action="edit-education"
            data-id="${entry.id}"
            title="Edit"
          >
            <i class="fa-solid fa-pen"></i>
          </button>

          <button
            type="button"
            class="delete"
            data-action="delete-education"
            data-id="${entry.id}"
            title="Delete"
          >
            <i class="fa-solid fa-trash"></i>
          </button>

        </div>

      </div>
    `)
    .join("");
};

const renderEducationPreview = () => {
  if (!state.education.length) {
    previewEducation.innerHTML = `
      <div class="portfolio-empty">
        No education added yet.
      </div>
    `;

    return;
  }

  previewEducation.innerHTML = state.education
    .map(entry => {

      const date =
        entry.start || entry.end
          ? `${escapeHTML(entry.start || "")}${entry.end ? ` - ${escapeHTML(entry.end)}` : ""}`
          : "";

      return `
        <article class="education-card">

          <div class="education-icon">
            <i class="fa-solid fa-graduation-cap"></i>
          </div>

          <h3>${escapeHTML(entry.degree)}</h3>

          <h4>${escapeHTML(entry.institution)}</h4>

          ${
            date
              ? `<div class="education-date">${date}</div>`
              : ""
          }

          ${
            entry.description
              ? `<p>${escapeHTML(entry.description)}</p>`
              : ""
          }

        </article>
      `;
    })
    .join("");
};

/* ============================================================
   PROJECTS
============================================================ */

const renderProjectsEditor = () => {
  if (!state.projects.length) {
    projectsEditor.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-folder-open"></i>
        <strong>No projects added</strong>
        <span>Add a project to showcase your work.</span>
      </div>
    `;

    return;
  }

  projectsEditor.innerHTML = state.projects
    .map(project => `
      <div class="entry-card">

        <div class="entry-card-content">
          <h4>${escapeHTML(project.name)}</h4>
          <p>
            ${escapeHTML(project.technologies || "Project")}
          </p>
        </div>

        <div class="entry-actions">

          <button
            type="button"
            data-action="edit-project"
            data-id="${project.id}"
            title="Edit"
          >
            <i class="fa-solid fa-pen"></i>
          </button>

          <button
            type="button"
            class="delete"
            data-action="delete-project"
            data-id="${project.id}"
            title="Delete"
          >
            <i class="fa-solid fa-trash"></i>
          </button>

        </div>

      </div>
    `)
    .join("");
};

const renderProjectsPreview = () => {
  if (!state.projects.length) {
    previewProjects.innerHTML = `
      <div class="portfolio-empty">
        Projects will appear here when you add them.
      </div>
    `;

    return;
  }

  previewProjects.innerHTML = state.projects
    .map(project => {

      const technologies = project.technologies
        ? project.technologies
            .split(",")
            .map(item => item.trim())
            .filter(Boolean)
        : [];

      const image = isValidURL(project.image)
        ? safeURL(project.image)
        : "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80";

      return `
        <article class="project-card">

          <img
            class="project-image"
            src="${escapeHTML(image)}"
            alt="${escapeHTML(project.name)} project preview"
            loading="lazy"
            onerror="this.src='https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80'"
          >

          <div class="project-body">

            <h3>${escapeHTML(project.name)}</h3>

            ${
              project.description
                ? `<p>${escapeHTML(project.description)}</p>`
                : ""
            }

            ${
              technologies.length
                ? `
                  <div class="project-tech">
                    ${technologies
                      .map(
                        technology =>
                          `<span>${escapeHTML(technology)}</span>`
                      )
                      .join("")}
                  </div>
                `
                : ""
            }

            ${
              project.live || project.github
                ? `
                  <div class="project-links">

                    ${
                      project.live && isValidURL(project.live)
                        ? `
                          <a
                            href="${escapeHTML(safeURL(project.live))}"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            Live Demo
                          </a>
                        `
                        : ""
                    }

                    ${
                      project.github && isValidURL(project.github)
                        ? `
                          <a
                            href="${escapeHTML(safeURL(project.github))}"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <i class="fa-brands fa-github"></i>
                            GitHub
                          </a>
                        `
                        : ""
                    }

                  </div>
                `
                : ""
            }

          </div>

        </article>
      `;
    })
    .join("");
};

/* ============================================================
   CONTACT PREVIEW
============================================================ */

const renderContact = () => {

  const contactEmail =
    state.contact.email ||
    state.personal.email;

  const contactPhone =
    state.contact.phone ||
    state.personal.phone;

  const contactLocation =
    state.contact.location ||
    state.personal.location;

  const cards = [];

  if (contactEmail) {
    cards.push(`
      <a
        class="contact-card"
        href="mailto:${escapeHTML(contactEmail)}"
      >
        <div class="contact-card-icon">
          <i class="fa-solid fa-envelope"></i>
        </div>

        <div>
          <small>Email</small>
          <strong>${escapeHTML(contactEmail)}</strong>
        </div>
      </a>
    `);
  }

  if (contactPhone) {
    cards.push(`
      <a
        class="contact-card"
        href="tel:${escapeHTML(contactPhone)}"
      >
        <div class="contact-card-icon">
          <i class="fa-solid fa-phone"></i>
        </div>

        <div>
          <small>Phone</small>
          <strong>${escapeHTML(contactPhone)}</strong>
        </div>
      </a>
    `);
  }

  if (contactLocation) {
    cards.push(`
      <div class="contact-card">

        <div class="contact-card-icon">
          <i class="fa-solid fa-location-dot"></i>
        </div>

        <div>
          <small>Location</small>
          <strong>${escapeHTML(contactLocation)}</strong>
        </div>

      </div>
    `);
  }

  previewContact.innerHTML =
    cards.join("") ||
    `
      <div class="portfolio-empty">
        Add contact information to display it here.
      </div>
    `;
};

/* ============================================================
   MAIN PREVIEW
============================================================ */

const renderPreview = () => {

  previewName.textContent =
    state.personal.fullName || "Your Name";

  previewTitle.textContent =
    state.personal.professionalTitle ||
    "Frontend Developer";

  previewShortBio.textContent =
    state.personal.shortBio ||
    "Building modern and responsive web experiences.";

  previewAbout.textContent =
    state.personal.aboutMe ||
    "Tell visitors about your background, interests, experience and professional goals.";

  previewFooterName.textContent =
    state.personal.fullName || "Your Name";

  const photo = isImageSource(state.personal.profilePhoto)
    ? state.personal.profilePhoto
    : DEFAULT_PROFILE_PHOTO;

  previewPhoto.src = photo;

  previewPhoto.onerror = () => {
    previewPhoto.onerror = null;
    previewPhoto.src = DEFAULT_PROFILE_PHOTO;
  };

  renderSocialLinks();
  renderSkillsPreview();
  renderExperiencePreview();
  renderEducationPreview();
  renderProjectsPreview();
  renderContact();

  applyCustomization();
};

/* ============================================================
   FULL RENDER
============================================================ */

const renderAll = () => {
  renderSkillsEditor();
  renderExperienceEditor();
  renderEducationEditor();
  renderProjectsEditor();
  renderPreview();
};

/* ============================================================
   MODAL
============================================================ */

const resetModalFields = () => {
  entryForm.reset();

  $("#expJobTitle").value = "";
  $("#expCompany").value = "";
  $("#expStart").value = "";
  $("#expEnd").value = "";
  $("#expDescription").value = "";

  $("#eduDegree").value = "";
  $("#eduInstitution").value = "";
  $("#eduStart").value = "";
  $("#eduEnd").value = "";
  $("#eduDescription").value = "";

  $("#projectName").value = "";
  $("#projectImage").value = "";
  $("#projectDescription").value = "";
  $("#projectTechnologies").value = "";
  $("#projectLive").value = "";
  $("#projectGithub").value = "";
};

const openModal = (type, id = null) => {

  modalType = type;
  editingId = id;

  resetModalFields();

  experienceFields.classList.toggle(
    "hidden",
    type !== "experience"
  );

  educationFields.classList.toggle(
    "hidden",
    type !== "education"
  );

  projectFields.classList.toggle(
    "hidden",
    type !== "project"
  );

  const titles = {
    experience: id
      ? "Edit Experience"
      : "Add Experience",

    education: id
      ? "Edit Education"
      : "Add Education",

    project: id
      ? "Edit Project"
      : "Add Project"
  };

  modalTitle.textContent = titles[type];

  if (id) {
    populateModalForEdit(type, id);
  }

  entryModal.classList.add("active");

  setTimeout(() => {
    const firstVisibleInput =
      $(
        ".modal-fields:not(.hidden) input",
        entryModal
      );

    firstVisibleInput?.focus();
  }, 50);
};

const closeModal = () => {
  entryModal.classList.remove("active");

  modalType = null;
  editingId = null;

  resetModalFields();
};

const populateModalForEdit = (type, id) => {

  if (type === "experience") {

    const entry =
      state.experience.find(item => item.id === id);

    if (!entry) return;

    $("#expJobTitle").value = entry.jobTitle;
    $("#expCompany").value = entry.company;
    $("#expStart").value = entry.start;
    $("#expEnd").value = entry.end;
    $("#expDescription").value = entry.description;
  }

  if (type === "education") {

    const entry =
      state.education.find(item => item.id === id);

    if (!entry) return;

    $("#eduDegree").value = entry.degree;
    $("#eduInstitution").value = entry.institution;
    $("#eduStart").value = entry.start;
    $("#eduEnd").value = entry.end;
    $("#eduDescription").value = entry.description;
  }

  if (type === "project") {

    const entry =
      state.projects.find(item => item.id === id);

    if (!entry) return;

    $("#projectName").value = entry.name;
    $("#projectImage").value = entry.image;
    $("#projectDescription").value = entry.description;
    $("#projectTechnologies").value = entry.technologies;
    $("#projectLive").value = entry.live;
    $("#projectGithub").value = entry.github;
  }
};

/* ============================================================
   MODAL SUBMIT
============================================================ */

const submitModal = event => {

  event.preventDefault();

  if (modalType === "experience") {

    const jobTitle =
      $("#expJobTitle").value.trim();

    const company =
      $("#expCompany").value.trim();

    if (!jobTitle || !company) {
      showToast(
        "Job title and company are required.",
        "error"
      );
      return;
    }

    const data = {
      id: editingId || createId(),
      jobTitle,
      company,
      start: $("#expStart").value.trim(),
      end: $("#expEnd").value.trim(),
      description: $("#expDescription").value.trim()
    };

    if (editingId) {
      state.experience =
        state.experience.map(item =>
          item.id === editingId
            ? data
            : item
        );

      showToast("Experience updated.");
    } else {
      state.experience.push(data);
      showToast("Experience added.");
    }
  }

  if (modalType === "education") {

    const degree =
      $("#eduDegree").value.trim();

    const institution =
      $("#eduInstitution").value.trim();

    if (!degree || !institution) {
      showToast(
        "Degree and institution are required.",
        "error"
      );
      return;
    }

    const data = {
      id: editingId || createId(),
      degree,
      institution,
      start: $("#eduStart").value.trim(),
      end: $("#eduEnd").value.trim(),
      description: $("#eduDescription").value.trim()
    };

    if (editingId) {
      state.education =
        state.education.map(item =>
          item.id === editingId
            ? data
            : item
        );

      showToast("Education updated.");
    } else {
      state.education.push(data);
      showToast("Education added.");
    }
  }

  if (modalType === "project") {

    const name =
      $("#projectName").value.trim();

    if (!name) {
      showToast(
        "Project name is required.",
        "error"
      );
      return;
    }

    const image =
      $("#projectImage").value.trim();

    const live =
      $("#projectLive").value.trim();

    const github =
      $("#projectGithub").value.trim();

    if (image && !isValidURL(image)) {
      showToast(
        "Project image URL is invalid.",
        "error"
      );
      return;
    }

    if (live && !isValidURL(live)) {
      showToast(
        "Live demo URL is invalid.",
        "error"
      );
      return;
    }

    if (github && !isValidURL(github)) {
      showToast(
        "GitHub URL is invalid.",
        "error"
      );
      return;
    }

    const data = {
      id: editingId || createId(),
      name,
      image,
      description:
        $("#projectDescription").value.trim(),
      technologies:
        $("#projectTechnologies").value.trim(),
      live,
      github
    };

    if (editingId) {
      state.projects =
        state.projects.map(item =>
          item.id === editingId
            ? data
            : item
        );

      showToast("Project updated.");
    } else {
      state.projects.push(data);
      showToast("Project added.");
    }
  }

  saveToStorage();

  renderAll();

  closeModal();
};

/* ============================================================
   ENTRY DELETE / EDIT EVENTS
============================================================ */

const handleExperienceAction = (id, action) => {

  if (action === "edit-experience") {
    openModal("experience", id);
    return;
  }

  if (action === "delete-experience") {

    const confirmed = confirm(
      "Delete this experience entry?"
    );

    if (!confirmed) return;

    state.experience =
      state.experience.filter(item => item.id !== id);

    saveToStorage();
    renderAll();

    showToast("Experience deleted.");
  }
};

const handleEducationAction = (id, action) => {

  if (action === "edit-education") {
    openModal("education", id);
    return;
  }

  if (action === "delete-education") {

    const confirmed = confirm(
      "Delete this education entry?"
    );

    if (!confirmed) return;

    state.education =
      state.education.filter(item => item.id !== id);

    saveToStorage();
    renderAll();

    showToast("Education deleted.");
  }
};

const handleProjectAction = (id, action) => {

  if (action === "edit-project") {
    openModal("project", id);
    return;
  }

  if (action === "delete-project") {

    const confirmed = confirm(
      "Delete this project?"
    );

    if (!confirmed) return;

    state.projects =
      state.projects.filter(item => item.id !== id);

    saveToStorage();
    renderAll();

    showToast("Project deleted.");
  }
};

/* ============================================================
   DOWNLOAD PORTFOLIO
============================================================ */

const buildStandalonePortfolio = () => {

  const accent =
    state.customization.accentColor || "#6366f1";

  const font =
    state.customization.font || "Inter";

  const theme =
    state.customization.theme === "dark";

  const name =
    state.personal.fullName || "Developer";

  const title =
    state.personal.professionalTitle ||
    "Frontend Developer";

  const photo = isImageSource(state.personal.profilePhoto)
    ? state.personal.profilePhoto
    : DEFAULT_PROFILE_PHOTO;

  const socials = Object.entries(state.social)
    .filter(([, value]) => value && isValidURL(value))
    .map(([type, value]) => {

      const icons = {
        github: "GitHub",
        linkedin: "LinkedIn",
        twitter: "X",
        website: "Website"
      };

      return `
        <a href="${safeURL(value)}"
           target="_blank"
           rel="noopener noreferrer">
          ${icons[type]}
        </a>
      `;
    })
    .join("");

  const skills = state.skills
    .map(skill => `<span>${escapeHTML(skill)}</span>`)
    .join("");

  const experience = state.experience
    .map(entry => `
      <article class="timeline-item">

        <strong>
          ${escapeHTML(entry.jobTitle)}
        </strong>

        <div class="muted">
          ${escapeHTML(entry.company)}
          ${
            entry.start
              ? ` · ${escapeHTML(entry.start)}`
              : ""
          }
          ${
            entry.end
              ? ` - ${escapeHTML(entry.end)}`
              : ""
          }
        </div>

        ${
          entry.description
            ? `<p>${escapeHTML(entry.description)}</p>`
            : ""
        }

      </article>
    `)
    .join("");

  const education = state.education
    .map(entry => `
      <article class="card">

        <h3>${escapeHTML(entry.degree)}</h3>

        <strong>
          ${escapeHTML(entry.institution)}
        </strong>

        <small>
          ${escapeHTML(entry.start || "")}
          ${
            entry.end
              ? ` - ${escapeHTML(entry.end)}`
              : ""
          }
        </small>

        ${
          entry.description
            ? `<p>${escapeHTML(entry.description)}</p>`
            : ""
        }

      </article>
    `)
    .join("");

  const projects = state.projects
    .map(project => {

      const image =
        project.image && isValidURL(project.image)
          ? safeURL(project.image)
          : "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80";

      const tech =
        project.technologies
          ? project.technologies
              .split(",")
              .map(item => item.trim())
              .filter(Boolean)
              .map(item => `<span>${escapeHTML(item)}</span>`)
              .join("")
          : "";

      return `
        <article class="project">

          <img
            src="${escapeHTML(image)}"
            alt="${escapeHTML(project.name)}"
          >

          <div class="project-content">

            <h3>${escapeHTML(project.name)}</h3>

            ${
              project.description
                ? `<p>${escapeHTML(project.description)}</p>`
                : ""
            }

            <div class="tech">
              ${tech}
            </div>

            <div class="links">

              ${
                project.live && isValidURL(project.live)
                  ? `
                    <a href="${safeURL(project.live)}"
                       target="_blank">
                      Live Demo
                    </a>
                  `
                  : ""
              }

              ${
                project.github && isValidURL(project.github)
                  ? `
                    <a href="${safeURL(project.github)}"
                       target="_blank">
                      GitHub
                    </a>
                  `
                  : ""
              }

            </div>

          </div>

        </article>
      `;
    })
    .join("");

  const contactEmail =
    state.contact.email ||
    state.personal.email;

  const contactPhone =
    state.contact.phone ||
    state.personal.phone;

  const contactLocation =
    state.contact.location ||
    state.personal.location;

  return `<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8">

<meta name="viewport"
      content="width=device-width, initial-scale=1.0">

<meta name="description"
      content="${escapeHTML(
        state.personal.shortBio || title
      )}">

<title>${escapeHTML(name)} — ${escapeHTML(title)}</title>

<link rel="preconnect"
      href="https://fonts.googleapis.com">

<link rel="preconnect"
      href="https://fonts.gstatic.com"
      crossorigin>

<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    font
  )}:wght@400;500;600;700;800&display=swap"
      rel="stylesheet">

<style>

:root {
  --accent: ${accent};
  --text: ${theme ? "#f5f7fb" : "#151827"};
  --muted: ${theme ? "#aab4c4" : "#667085"};
  --bg: ${theme ? "#101720" : "#ffffff"};
  --soft: ${theme ? "#18212c" : "#f7f8fc"};
  --border: ${theme ? "#2b3441" : "#e7eaf0"};
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;

  color: var(--text);
  background: var(--bg);

  font-family: "${font}", sans-serif;

  line-height: 1.6;
}

a {
  color: inherit;
  text-decoration: none;
}

.container {
  width: min(1100px, 90%);
  margin: auto;
}

.hero {
  min-height: 650px;

  display: grid;
  grid-template-columns: 230px 1fr;

  align-items: center;

  gap: 70px;

  padding: 80px 0;
}

.profile {
  width: 220px;
  height: 220px;

  padding: 7px;

  border-radius: 50%;

  background: var(--accent);
}

.profile img {
  width: 100%;
  height: 100%;

  object-fit: cover;

  border-radius: 50%;
}

.eyebrow {
  color: var(--accent);

  font-size: 11px;
  font-weight: 800;

  letter-spacing: 2px;
}

h1 {
  font-size: clamp(40px, 7vw, 72px);

  line-height: 1.05;

  letter-spacing: -3px;

  margin: 10px 0;
}

h2 {
  font-size: 28px;
}

.hero h2 {
  color: var(--accent);
}

.hero p {
  color: var(--muted);

  max-width: 650px;
}

.socials {
  display: flex;
  flex-wrap: wrap;

  gap: 9px;

  margin: 24px 0;
}

.socials a {
  padding: 9px 13px;

  border: 1px solid var(--border);

  border-radius: 8px;

  font-size: 12px;
}

.socials a:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.button {
  display: inline-block;

  padding: 11px 17px;

  color: #fff;

  background: var(--accent);

  border-radius: 8px;

  font-size: 12px;
  font-weight: 700;
}

section {
  padding: 80px 0;

  border-top: 1px solid var(--border);
}

.muted {
  color: var(--muted);
}

.about {
  max-width: 800px;

  color: var(--muted);

  white-space: pre-line;
}

.skills {
  display: flex;
  flex-wrap: wrap;

  gap: 10px;
}

.skills span,
.tech span {
  padding: 7px 10px;

  color: var(--accent);

  background: var(--soft);

  border-radius: 7px;

  font-size: 11px;
  font-weight: 700;
}

.timeline {
  max-width: 850px;
}

.timeline-item {
  padding: 22px 0;

  border-bottom: 1px solid var(--border);
}

.timeline-item p {
  color: var(--muted);

  white-space: pre-line;
}

.cards,
.projects {
  display: grid;

  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap: 18px;
}

.card,
.project {
  background: var(--soft);

  border: 1px solid var(--border);

  border-radius: 12px;

  overflow: hidden;
}

.card {
  padding: 22px;
}

.card strong {
  color: var(--accent);

  display: block;
}

.card small {
  color: var(--muted);
}

.card p,
.project p {
  color: var(--muted);
}

.project img {
  width: 100%;
  height: 220px;

  object-fit: cover;
}

.project-content {
  padding: 22px;
}

.tech {
  display: flex;
  flex-wrap: wrap;

  gap: 6px;

  margin: 14px 0;
}

.links {
  display: flex;

  gap: 8px;
}

.links a {
  padding: 8px 11px;

  border: 1px solid var(--border);

  border-radius: 7px;

  font-size: 11px;
  font-weight: 700;
}

.links a:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.contact {
  background: var(--soft);
}

.contact-grid {
  display: grid;

  grid-template-columns:
    repeat(3, minmax(0, 1fr));

  gap: 12px;
}

.contact-card {
  padding: 20px;

  background: var(--bg);

  border: 1px solid var(--border);

  border-radius: 10px;
}

.contact-card small {
  display: block;

  color: var(--muted);

  font-size: 10px;
}

.contact-card strong {
  font-size: 12px;
}

footer {
  padding: 25px 0;

  color: var(--muted);

  font-size: 11px;

  border-top: 1px solid var(--border);
}

@media(max-width: 700px) {

  .hero {
    grid-template-columns: 1fr;

    text-align: center;

    justify-items: center;

    gap: 35px;
  }

  .hero p {
    margin-left: auto;
    margin-right: auto;
  }

  .socials {
    justify-content: center;
  }

  .cards,
  .projects,
  .contact-grid {
    grid-template-columns: 1fr;
  }

  section {
    padding: 55px 0;
  }
}

@media print {

  body {
    background: #fff !important;
    color: #111 !important;
  }

  .hero,
  section {
    break-inside: avoid;
  }
}

</style>

</head>

<body>

<header class="hero container">

  <div class="profile">
    <img src="${escapeHTML(photo)}"
         alt="${escapeHTML(name)}">
  </div>

  <div>

    <span class="eyebrow">
      HELLO, I'M
    </span>

    <h1>${escapeHTML(name)}</h1>

    <h2>${escapeHTML(title)}</h2>

    <p>
      ${escapeHTML(
        state.personal.shortBio ||
        "Building modern and responsive web experiences."
      )}
    </p>

    <div class="socials">
      ${socials}
    </div>

    ${
      contactEmail
        ? `
          <a class="button"
             href="mailto:${escapeHTML(contactEmail)}">
            Contact Me
          </a>
        `
        : ""
    }

  </div>

</header>

<main>

<section>
<div class="container">

<h2>About Me</h2>

<p class="about">
${escapeHTML(
  state.personal.aboutMe ||
  "Welcome to my professional portfolio."
)}
</p>

</div>
</section>

<section>
<div class="container">

<h2>Skills</h2>

<div class="skills">
${skills || "<span>No skills added.</span>"}
</div>

</div>
</section>

<section>
<div class="container">

<h2>Experience</h2>

<div class="timeline">
${experience || "<p class='muted'>No experience added.</p>"}
</div>

</div>
</section>

<section>
<div class="container">

<h2>Education</h2>

<div class="cards">
${education || "<p class='muted'>No education added.</p>"}
</div>

</div>
</section>

<section>
<div class="container">

<h2>Projects</h2>

<div class="projects">
${projects || "<p class='muted'>No projects added.</p>"}
</div>

</div>
</section>

<section class="contact">
<div class="container">

<h2>Get In Touch</h2>

<div class="contact-grid">

${
  contactEmail
    ? `
      <div class="contact-card">
        <small>Email</small>
        <strong>${escapeHTML(contactEmail)}</strong>
      </div>
    `
    : ""
}

${
  contactPhone
    ? `
      <div class="contact-card">
        <small>Phone</small>
        <strong>${escapeHTML(contactPhone)}</strong>
      </div>
    `
    : ""
}

${
  contactLocation
    ? `
      <div class="contact-card">
        <small>Location</small>
        <strong>${escapeHTML(contactLocation)}</strong>
      </div>
    `
    : ""
}

</div>

</div>
</section>

</main>

<footer>

<div class="container">

© ${new Date().getFullYear()}
${escapeHTML(name)}.
Built with DevFolio Builder.

</div>

</footer>

</body>
</html>`;
};

const downloadPortfolio = () => {

  getInputState();

  if (!validatePortfolio()) {
    showToast(
      "Please fix the highlighted information first.",
      "error"
    );
    return;
  }

  const html = buildStandalonePortfolio();

  const blob = new Blob(
    [html],
    { type: "text/html;charset=utf-8" }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  const filename =
    (state.personal.fullName || "developer-portfolio")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") ||
    "developer-portfolio";

  link.href = url;
  link.download = `${filename}.html`;

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);

  showToast("Portfolio downloaded successfully.");
};

/* ============================================================
   SAVE / LOAD / RESET
============================================================ */

const savePortfolio = () => {

  getInputState();

  if (!validatePortfolio()) {
    showToast(
      "Please fix the form errors before saving.",
      "error"
    );
    return;
  }

  saveToStorage();

  renderPreview();

  showToast("Portfolio saved successfully.");
};

const loadPortfolio = () => {

  const loaded = loadFromStorage();

  if (!loaded) {
    showToast(
      "No saved portfolio was found.",
      "error"
    );
    return;
  }

  populateForm();

  renderAll();

  showToast("Portfolio loaded successfully.");
};

const resetPortfolio = () => {

  const confirmed = confirm(
    "Are you sure you want to reset your portfolio? This will remove all saved data."
  );

  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);

  state = createDefaultState();

  populateForm();
  renderAll();

  showToast("Portfolio reset successfully.");
};

/* ============================================================
   REAL-TIME FORM HANDLING
============================================================ */

const updateFromInputs = debounce(() => {

  getInputState();

  renderPreview();

  saveToStorage();

}, 150);

const attachLiveInputListeners = () => {

  const fields = [
    fullNameInput,
    professionalTitleInput,
    emailInput,
    phoneInput,
    locationInput,
    shortBioInput,
    aboutMeInput,

    githubInput,
    linkedinInput,
    twitterInput,
    websiteInput,

    contactEmailInput,
    contactPhoneInput,
    contactLocationInput
  ];

  fields.forEach(field => {
    field.addEventListener("input", updateFromInputs);
    field.addEventListener("change", updateFromInputs);
  });

  layoutSelect.addEventListener("change", () => {

    getInputState();

    applyCustomization();

    saveToStorage();

    renderPreview();
  });

  fontSelect.addEventListener("change", () => {

    getInputState();

    applyCustomization();

    saveToStorage();

    renderPreview();
  });

  accentColorInput.addEventListener("input", () => {

    getInputState();

    applyCustomization();

    saveToStorage();

    renderPreview();
  });
};

/* ============================================================
   PREVIEW MODE
============================================================ */

const togglePreviewMode = () => {

  const enabled =
    document.body.classList.toggle("preview-only");

  const button = $("#previewModeBtn");

  if (enabled) {

    button.innerHTML = `
      <i class="fa-solid fa-pen"></i>
      <span>Edit</span>
    `;

  } else {

    button.innerHTML = `
      <i class="fa-solid fa-eye"></i>
      <span>Preview</span>
    `;
  }
};

/* ============================================================
   FULLSCREEN
============================================================ */

const toggleFullscreen = async () => {

  const frame = $(".portfolio-frame");

  try {

    if (!document.fullscreenElement) {
      await frame.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }

  } catch {
    showToast(
      "Fullscreen is not supported by this browser.",
      "error"
    );
  }
};

/* ============================================================
   EVENT LISTENERS
============================================================ */

$("#addSkillBtn").addEventListener(
  "click",
  addSkill
);

skillInput.addEventListener("keydown", event => {

  if (event.key === "Enter") {
    event.preventDefault();
    addSkill();
  }

});

skillsContainer.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(".remove-skill");

    if (!button) return;

    const index =
      Number(button.dataset.index);

    removeSkill(index);
  }
);

$("#addExperienceBtn").addEventListener(
  "click",
  () => openModal("experience")
);

$("#addEducationBtn").addEventListener(
  "click",
  () => openModal("education")
);

$("#addProjectBtn").addEventListener(
  "click",
  () => openModal("project")
);

experienceEditor.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest("[data-action]");

    if (!button) return;

    handleExperienceAction(
      button.dataset.id,
      button.dataset.action
    );
  }
);

educationEditor.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest("[data-action]");

    if (!button) return;

    handleEducationAction(
      button.dataset.id,
      button.dataset.action
    );
  }
);

projectsEditor.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest("[data-action]");

    if (!button) return;

    handleProjectAction(
      button.dataset.id,
      button.dataset.action
    );
  }
);

entryForm.addEventListener(
  "submit",
  submitModal
);

modalClose.addEventListener(
  "click",
  closeModal
);

cancelModal.addEventListener(
  "click",
  closeModal
);

entryModal.addEventListener(
  "click",
  event => {

    if (event.target === entryModal) {
      closeModal();
    }
  }
);

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape" &&
      entryModal.classList.contains("active")
    ) {
      closeModal();
    }
  }
);

$$(".theme-option").forEach(button => {

  button.addEventListener(
    "click",
    () => {

      const theme =
        button.dataset.theme;

      applyTheme(theme);

      saveToStorage();

      renderPreview();
    }
  );

});

$("#themeToggle").addEventListener(
  "click",
  () => {

    const newTheme =
      state.customization.theme === "dark"
        ? "light"
        : "dark";

    applyTheme(newTheme);

    saveToStorage();

    renderPreview();
  }
);

$("#previewModeBtn").addEventListener(
  "click",
  togglePreviewMode
);

$("#fullscreenBtn").addEventListener(
  "click",
  toggleFullscreen
);

$("#saveBtn").addEventListener(
  "click",
  savePortfolio
);

$("#loadBtn").addEventListener(
  "click",
  loadPortfolio
);

$("#downloadBtn").addEventListener(
  "click",
  downloadPortfolio
);

$("#printBtn").addEventListener(
  "click",
  () => {

    getInputState();

    if (!validatePortfolio()) {
      showToast(
        "Please fix the form errors before printing.",
        "error"
      );
      return;
    }

    renderPreview();

    window.print();
  }
);

$("#resetBtn").addEventListener(
  "click",
  resetPortfolio
);

/* ============================================================
   PROFILE PHOTO UPLOAD
============================================================ */

profilePhotoInput.addEventListener(
  "change",
  async event => {

    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast(
        "Please select a valid image file.",
        "error"
      );

      profilePhotoInput.value = "";
      return;
    }

    try {
      const dataURL = await readImageAsDataURL(file);

      // Store the image as a data URL so it works in the live
      // preview, localStorage, and the downloaded HTML portfolio.
      state.personal.profilePhoto = dataURL;

      previewPhoto.src = dataURL;

      saveToStorage();

      showToast("Profile photo uploaded successfully.");
    } catch (error) {
      console.error("Profile photo upload failed:", error);

      showToast(
        error.message || "Could not upload the profile photo.",
        "error"
      );
    }
  }
);

/* ============================================================
   INITIALIZATION
============================================================ */

const initializeApp = () => {

  const loaded = loadFromStorage();

  populateForm();

  renderAll();

  attachLiveInputListeners();

  if (loaded) {
    showToast("Saved portfolio restored.");
  }
};

initializeApp();