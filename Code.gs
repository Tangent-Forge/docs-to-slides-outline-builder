/**
 * Docs→Slides Outline Builder - Google Workspace Add-on
 * Convert Google Docs content into structured Google Slides outlines
 */

const UI_LABEL = 'Docs to Slides Outline Builder';

// ========================================
// Add-on Initialization
// ========================================

/**
 * Called when the add-on is installed
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Called when a document is opened
 */
function onOpen(e) {
  DocumentApp.getUi()
    .createMenu('Docs to Slides')
    .addItem('Create Outline', 'showSidebar')
    .addToUi();
}

/**
 * Opens the sidebar
 */
function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle(UI_LABEL);
  DocumentApp.getUi().showSidebar(html);
}

// ========================================
// API Functions (Called from Sidebar)
// ========================================

/**
 * API: Get Doc outline
 */
function apiGetOutline() {
  try {
    const doc = DocumentApp.getActiveDocument();
    const outline = DocsParser.parseOutline(doc);
    return outline;
  } catch (err) {
    console.error('Get outline failed:', err);
    throw new Error('Get outline failed: ' + err.message);
  }
}

/**
 * API: Create Slides from outline
 */
function apiCreateSlides(outline, options = {}) {
  try {
    const result = SlidesCreator.createPresentation(outline, options);
    return result;
  } catch (err) {
    console.error('Create slides failed:', err);
    throw new Error('Create slides failed: ' + err.message);
  }
}

// ========================================
// Docs Parser Module
// ========================================

const DocsParser = (() => {
  function parseOutline(doc) {
    const body = doc.getBody();
    const paragraphs = body.getParagraphs();
    const slides = [];
    let currentSlide = null;
    
    paragraphs.forEach(paragraph => {
      const text = paragraph.getText().trim();
      if (!text) return;
      
      const heading = paragraph.getHeading();
      
      // H1 creates a new slide
      if (heading === DocumentApp.ParagraphHeading.HEADING_1) {
        if (currentSlide) {
          slides.push(currentSlide);
        }
        currentSlide = {
          title: text,
          bullets: []
        };
      }
      // H2 becomes a bullet point
      else if (heading === DocumentApp.ParagraphHeading.HEADING_2) {
        if (currentSlide) {
          currentSlide.bullets.push({
            text: text,
            level: 0
          });
        }
      }
      // H3 becomes a nested bullet point
      else if (heading === DocumentApp.ParagraphHeading.HEADING_3) {
        if (currentSlide && currentSlide.bullets.length > 0) {
          currentSlide.bullets.push({
            text: text,
            level: 1
          });
        }
      }
      // Regular text becomes bullet points if we have a current slide
      else if (currentSlide) {
        currentSlide.bullets.push({
          text: text,
          level: 0
        });
      }
    });
    
    // Don't forget the last slide
    if (currentSlide) {
      slides.push(currentSlide);
    }
    
    return {
      title: doc.getName(),
      slides: slides
    };
  }
  
  return {
    parseOutline
  };
})();

// ========================================
// Slides Creator Module
// ========================================

const SlidesCreator = (() => {
  function createPresentation(outline, options = {}) {
    // Create new presentation
    const presentation = SlidesApp.create(outline.title + ' - Presentation');
    
    // Create slides from outline
    outline.slides.forEach((slideData, index) => {
      const slide = presentation.appendSlide();
      
      // Add title
      const titlePlaceholder = slide.getPageElements().find(element => 
        element.getPageElementType() === SlidesApp.PageElementType.TITLE
      );
      if (titlePlaceholder) {
        titlePlaceholder.asShape().getText().setText(slideData.title);
      }
      
      // Add body/bullets
      const bodyPlaceholder = slide.getPageElements().find(element => 
        element.getPageElementType() === SlidesApp.PageElementType.BODY
      );
      if (bodyPlaceholder && slideData.bullets.length > 0) {
        const textRange = bodyPlaceholder.asShape().getText();
        textRange.clear();
        
        slideData.bullets.forEach(bullet => {
          const prefix = bullet.level > 0 ? '  • ' : '• ';
          textRange.appendParagraph(prefix + bullet.text);
        });
      }
    });
    
    // Save and close
    presentation.saveAndClose();
    
    return {
      success: true,
      presentationId: presentation.getId(),
      url: presentation.getUrl(),
      slidesCreated: outline.slides.length
    };
  }
  
  return {
    createPresentation
  };
})();
