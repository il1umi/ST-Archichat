import test from 'node:test';
import assert from 'node:assert/strict';

import { runPromptPipeline } from '../../modules/noass/runtime/clewd/promptPipeline.js';

const prefixs = {
  user: 'Human',
  assistant: 'Assistant',
  system: 'System',
};

test('runPromptPipeline preserves clewd transform order and regex diagnostics', () => {
  const events = [];
  const input = [
    '',
    '',
    'System: rules',
    '',
    'Human: <regex order=1> "rules" : "RULES" </regex>hello',
    '',
    'Assistant: reply <@1>moved</@1>',
    '',
    'Human: <regex> "reply" : "ANSWER" </regex>tail',
  ].join('\n');

  const result = runPromptPipeline(input, prefixs, {
    logHandler: (event, payload) => events.push({ event, payload }),
  });

  assert.equal(
    result.prompt,
    'RULES\n\nHuman: hello\n\nAssistant: ANSWER \n\nmoved\n\nHuman: tail',
  );
  assert.equal(
    result.regexLog,
    '<regex order=1> "rules" : "RULES" </regex>\n<regex> "reply" : "ANSWER" </regex>\n',
  );
  assert.deepEqual(
    events.map(({ event, payload }) => [event, payload.order, payload.match]),
    [
      ['hyperRegex:match', 1, '<regex order=1> "rules" : "RULES" </regex>'],
      ['hyperRegex:match', 2, '<regex> "reply" : "ANSWER" </regex>'],
    ],
  );
});
