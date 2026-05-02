import React from 'react';
import { renderToString } from 'react-dom/server';
import EmojiPicker from 'emoji-picker-react';

console.log(renderToString(<EmojiPicker />));
