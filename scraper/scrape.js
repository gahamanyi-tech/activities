const fs = require('fs');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(fs.readFileSync('dom.html', 'utf-8'));
const $ = require('jquery')(dom.window);

// The "type" text on Canvas's planner combines course name + item type with
// no separator (e.g. "Intro to Python Assignment"). We split it by matching
// a known type keyword at the end.
const TYPE_KEYWORDS = ['Assignment', 'Quiz', 'Discussion Topic', 'Announcement', 'Peer Review', 'Wiki Page', 'Calendar Event'];

function splitCourseAndType(rawTypeText) {
  for (const keyword of TYPE_KEYWORDS) {
    if (rawTypeText.endsWith(keyword)) {
      return {
        course: rawTypeText.slice(0, rawTypeText.length - keyword.length).trim(),
        type: keyword
      };
    }
  }
  return { course: rawTypeText, type: 'Unknown' };
}

function scrapeData() {
  const items = $('[data-testid="planner-item-raw"]');

  if (items.length === 0) {
    console.log('No planner items found. Check dom.html was saved from the Dashboard List View.');
    return;
  }

  items.each(function () {
    const $item = $(this);

    const $titleLink = $item.find('a[data-cid="Link"]').first();
    const title = $titleLink.find('span[aria-hidden="true"]').first().text().trim();
    const link = $titleLink.attr('href');

    const rawType = $item.find('.PlannerItem-styles__type').text().trim();
    const { course, type } = splitCourseAndType(rawType);

    // Only keep actual assignments and quizzes -- skip announcements/discussions.
    if (type !== 'Assignment' && type !== 'Quiz') {
      return;
    }

    // The real completion state lives in this hidden accessibility text.
    const statusText = $item.find('.css-p7pe68-screenReaderContent').first().text();
    let status = 'Unknown';
    if (statusText.includes('is not marked as done')) {
      status = 'Upcoming';
    } else if (statusText.includes('is marked as done')) {
      status = 'Done';
    }

    // NOTE: only a TIME is shown per item on this page (the full date is a
    // heading above groups of items, not repeated on each one). Ask me to
    // extend this once you can share that heading's HTML too.
    const dueTime = $item.find('.PlannerItem-styles__due').text().trim();

    console.log(`Assignment Title: ${title}`);
    console.log(`Course: ${course}`);
    console.log(`Status: ${status}`);
    console.log(`Due Time: ${dueTime}`);
    if (link) {
      console.log(`Link: https://alueducation.instructure.com${link}`);
    }
    console.log('-----------------------------------');
  });
}

scrapeData();
