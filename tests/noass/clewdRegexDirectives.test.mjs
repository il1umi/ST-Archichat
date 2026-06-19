import test from 'node:test';
import assert from 'node:assert/strict';

import { applyRegexDirectives } from '../../modules/noass/runtime/clewd/regexDirectives.js';

test('applyRegexDirectives supports implicit order 2 directives and successful logging', () => {
  const events = [];

  const [content, regexLog] = applyRegexDirectives(
    '<regex> "foo" : "bar" </regex>\nfoo',
    2,
    {
      logHandler: (event, payload) => events.push({ event, payload }),
    },
  );

  assert.equal(content, '<regex> "bar" : "bar" </regex>\nfoo');
  assert.equal(regexLog, '<regex> "foo" : "bar" </regex>\n');
  assert.deepEqual(events, [
    {
      event: 'hyperRegex:match',
      payload: { order: 2, match: '<regex> "foo" : "bar" </regex>' },
    },
  ]);
});

test('applyRegexDirectives preserves order 3 directive self-mutation behavior', () => {
  const [content, regexLog] = applyRegexDirectives(
    '<regex order=3> "x" : "y" </regex>\nx',
    3,
  );

  assert.equal(content, '<regey order=3> "x" : "y" </regex>\nx');
  assert.equal(regexLog, '<regex order=3> "x" : "y" </regex>\n');
});

test('applyRegexDirectives reports invalid regex errors without calling match logger', () => {
  const events = [];
  const errors = [];

  const [content, regexLog] = applyRegexDirectives(
    '<regex order=1> "[" : "x" </regex>\n[',
    1,
    {
      logHandler: (event, payload) => events.push({ event, payload }),
      onError: (error) => errors.push(error),
    },
  );

  assert.equal(content, '<regex order=1> "[" : "x" </regex>\n[');
  assert.equal(regexLog, '<regex order=1> "[" : "x" </regex>\n');
  assert.equal(events.length, 0);
  assert.equal(errors.length, 1);
  assert.match(String(errors[0]), /Invalid regular expression/);
});
