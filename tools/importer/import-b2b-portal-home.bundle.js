/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-b2b-portal-home.js
  var import_b2b_portal_home_exports = {};
  __export(import_b2b_portal_home_exports, {
    default: () => import_b2b_portal_home_default
  });

  // tools/importer/parsers/columns-auth.js
  function parse(element, { document }) {
    const image = element.querySelector("img");
    const contentCol = element.querySelector(".-oneX-col-lg-7") || element;
    const heading = contentCol.querySelector("h1, h2");
    const paragraphs = Array.from(contentCol.querySelectorAll(":scope > p")).filter(
      (p) => !p.classList.contains("forgot")
    );
    const loginBtn = contentCol.querySelector('button, a.-oneX-btn-primary, [class*="btn-primary"]');
    let loginLink = null;
    if (loginBtn) {
      if (loginBtn.tagName === "A") {
        loginLink = loginBtn;
      } else {
        loginLink = document.createElement("a");
        loginLink.href = loginBtn.getAttribute("href") || "#login";
        loginLink.textContent = (loginBtn.textContent || "Log In").trim();
      }
    }
    const forgotPara = contentCol.querySelector("p.forgot");
    const quickLinksHeading = contentCol.querySelector("h6, h5, h4, h3");
    const quickLinks = Array.from(
      contentCol.querySelectorAll(".-oneX-icon-container a, .-oneX-flex-column a")
    );
    if (!heading && !image && paragraphs.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const contentCell = [];
    if (heading) contentCell.push(heading);
    paragraphs.forEach((p) => contentCell.push(p));
    if (loginLink) contentCell.push(loginLink);
    if (forgotPara) contentCell.push(forgotPara);
    if (quickLinksHeading) contentCell.push(quickLinksHeading);
    if (quickLinks.length > 0) {
      const list = document.createElement("ul");
      quickLinks.forEach((a) => {
        const li = document.createElement("li");
        li.appendChild(a);
        list.appendChild(li);
      });
      contentCell.push(list);
    }
    const imageCell = image ? [image] : [""];
    const cells = [];
    cells.push([imageCell, contentCell]);
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-auth", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-service.js
  function parse2(element, { document }) {
    const cards = Array.from(element.querySelectorAll(".-oneX-col-lg-4"));
    const cells = [];
    cards.forEach((card) => {
      const h4 = card.querySelector("h4");
      let iconCell = "";
      if (h4) {
        const iconName = Array.from(h4.classList).find((c) => c && c !== "title");
        if (iconName) {
          const iconText = document.createElement("p");
          iconText.textContent = `:${iconName}:`;
          iconCell = iconText;
        }
      }
      const contentCell = [];
      if (h4) {
        const anchors = Array.from(h4.querySelectorAll("a")).filter(
          (a) => a.textContent && a.textContent.trim().length > 0
        );
        const titleAnchor = anchors[0];
        if (titleAnchor) {
          const headingEl = document.createElement("h4");
          const link = document.createElement("a");
          link.href = titleAnchor.getAttribute("href") || "#";
          if (titleAnchor.getAttribute("title")) {
            link.title = titleAnchor.getAttribute("title");
          }
          const labelSource = titleAnchor.cloneNode(true);
          labelSource.querySelectorAll("br").forEach((br) => br.replaceWith(" "));
          link.textContent = labelSource.textContent.replace(/\s+/g, " ").trim();
          headingEl.appendChild(link);
          contentCell.push(headingEl);
        }
      }
      const descBlock = card.querySelector(".text-description");
      if (descBlock) {
        const desc = Array.from(descBlock.querySelectorAll("p")).find(
          (p) => p.textContent && p.textContent.replace(/ /g, "").trim().length > 0
        );
        if (desc) contentCell.push(desc);
      }
      const select = card.querySelector("select");
      if (select) {
        const options = Array.from(select.querySelectorAll("option")).map((o) => (o.textContent || "").trim()).filter((t) => t.length > 0 && t.toLowerCase() !== "select option");
        if (options.length > 0) {
          const list = document.createElement("ul");
          options.forEach((label) => {
            const li = document.createElement("li");
            li.textContent = label;
            list.appendChild(li);
          });
          contentCell.push(list);
        }
      }
      if (iconCell !== "" || contentCell.length > 0) {
        cells.push([iconCell, contentCell.length > 0 ? contentCell : ""]);
      }
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-service", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-promo.js
  function parse3(element, { document }) {
    const headingSource = element.querySelector(".-oneX-heading--h2, h2");
    let heading = null;
    if (headingSource) {
      if (headingSource.tagName === "H2") {
        heading = headingSource;
      } else {
        heading = document.createElement("h2");
        heading.textContent = (headingSource.textContent || "").replace(/\s+/g, " ").trim();
      }
    }
    const subheading = element.querySelector(".-oneX-cards-body h4, h4");
    const select = element.querySelector("select");
    let list = null;
    if (select) {
      const options = Array.from(select.querySelectorAll("option")).map((o) => (o.textContent || "").trim()).filter((t) => t.length > 0 && t.toLowerCase() !== "select a product");
      if (options.length > 0) {
        list = document.createElement("ul");
        options.forEach((label) => {
          const li = document.createElement("li");
          li.textContent = label;
          list.appendChild(li);
        });
      }
    }
    if (!heading && !subheading && !list) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const contentCell = [];
    if (heading) contentCell.push(heading);
    if (subheading) contentCell.push(subheading);
    if (list) contentCell.push(list);
    const cells = [];
    cells.push([contentCell]);
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-promo", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/statefarm-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      const body = element.querySelector("#b2b-edge-content");
      if (body) {
        element.replaceChildren(body);
      }
      WebImporter.DOMUtils.remove(element, [
        ".authentication-container.-oneX-d-none"
      ]);
      WebImporter.DOMUtils.remove(element, [
        ".cmp-experiencefragment--privacy-notice",
        ".cmp-experiencefragment--header",
        ".cmp-experiencefragment--footer",
        "#oneX-header",
        "#footer",
        ".breadcrumb-component",
        "sf-chat",
        "iframe",
        "script",
        "noscript"
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        ".cmp-experiencefragment--privacy-notice",
        ".cmp-experiencefragment--header",
        ".cmp-experiencefragment--footer",
        "#oneX-header",
        "#footer",
        ".breadcrumb-component",
        "sf-chat",
        "iframe",
        "script",
        "noscript",
        "link",
        "source"
      ]);
      element.querySelectorAll("*").forEach((el) => {
        el.removeAttribute("onclick");
        el.removeAttribute("data-analytics");
        el.removeAttribute("data-testid");
        el.removeAttribute("tabindex");
        el.removeAttribute("aria-hidden");
      });
    }
  }

  // tools/importer/transformers/statefarm-sections.js
  var TransformHook2 = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform2(hookName, element, payload) {
    if (hookName !== TransformHook2.afterTransform) return;
    const template = payload && payload.template;
    const sections = template && template.sections;
    if (!sections || sections.length < 2) return;
    const doc = element.ownerDocument;
    const resolved = sections.map((section) => {
      const selector = (section.selector || "").replace(/^#b2b-edge-content\s*/, "");
      const target = selector ? element.querySelector(selector) : null;
      return { section, target };
    });
    for (let i = resolved.length - 1; i >= 0; i -= 1) {
      const { section, target } = resolved[i];
      if (!target) continue;
      if (section.style) {
        const metadataBlock = WebImporter.Blocks.createBlock(doc, {
          name: "Section Metadata",
          cells: { style: section.style }
        });
        target.after(metadataBlock);
      }
      if (i > 0) {
        target.before(doc.createElement("hr"));
      }
    }
  }

  // tools/importer/import-b2b-portal-home.js
  var parsers = {
    "columns-auth": parse,
    "cards-service": parse2,
    "columns-promo": parse3
  };
  var PAGE_TEMPLATE = {
    name: "b2b-portal-home",
    description: "State Farm B2B portal home page with header (utility links + megamenu), hero/authentication section, service cards, insurance product section, and footer starting at the red slogan banner.",
    urls: [
      "https://b2b.statefarm.com/b2b-content"
    ],
    blocks: [
      {
        name: "columns-auth",
        instances: [
          "#b2b-edge-content .authentication-container:not(.-oneX-d-none) .htmlComponent > .-oneX-row"
        ]
      },
      {
        name: "cards-service",
        instances: [
          "#b2b-edge-content .gridComponent.parsys"
        ]
      },
      {
        name: "columns-promo",
        instances: [
          "#b2b-edge-content #xd-container-9bd333c99c"
        ]
      }
    ],
    sections: [
      {
        id: "section-2-hero",
        name: "Hero / Authentication",
        selector: "#b2b-edge-content .authentication-container:not(.-oneX-d-none) .htmlComponent > .-oneX-row",
        style: null,
        blocks: ["columns-auth"],
        defaultContent: []
      },
      {
        id: "section-3-cards",
        name: "Service Cards Grid",
        selector: "#b2b-edge-content .gridComponent.parsys",
        style: null,
        blocks: ["cards-service"],
        defaultContent: []
      },
      {
        id: "section-4-promo",
        name: "Insurance Product Section",
        selector: "#b2b-edge-content #xd-container-9bd333c99c",
        style: null,
        blocks: ["columns-promo"],
        defaultContent: []
      }
    ]
  };
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : []
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), {
      template: PAGE_TEMPLATE
    });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document, template) {
    const pageBlocks = [];
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) {
          console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
        }
        elements.forEach((element) => {
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_b2b_portal_home_default = {
    transform: (payload) => {
      const {
        document,
        url,
        html,
        params
      } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (parser) {
          try {
            parser(block.element, { document, url, params });
          } catch (e) {
            console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
          }
        } else {
          console.warn(`No parser found for block: ${block.name}`);
        }
      });
      executeTransformers("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const path = WebImporter.FileUtils.sanitizePath(
        new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html$/, "")
      );
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_b2b_portal_home_exports);
})();
