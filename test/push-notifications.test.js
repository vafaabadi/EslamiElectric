'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  _internal: { buildMessage, orderConfirmedContent, orderStatusContent, abandonedBasketReminderContent }
} = require('../lib/push-notifications');

describe('push-notifications message builder', () => {
  it('buildMessage sets channel, route, locale and merges data', () => {
    const msg = buildMessage({
      token: 'tok-1',
      title: 'Hello',
      body: 'World',
      channel: 'orders',
      route: 'order:abc',
      locale: 'fa',
      data: { orderId: 'abc', extra: 42 }
    });
    assert.equal(msg.token, 'tok-1');
    assert.equal(msg.notification.title, 'Hello');
    assert.equal(msg.data.channel, 'orders');
    assert.equal(msg.data.route, 'order:abc');
    assert.equal(msg.data.locale, 'fa');
    assert.equal(msg.data.orderId, 'abc');
    assert.equal(msg.data.extra, '42');
    assert.equal(msg.android.notification.channelId, 'orders');
    assert.equal(msg.android.priority, 'high');
  });

  it('buildMessage uses general channel and normal priority by default', () => {
    const msg = buildMessage({
      token: 't',
      title: 'T',
      body: 'B',
      channel: 'general'
    });
    assert.equal(msg.android.notification.channelId, 'general');
    assert.equal(msg.android.priority, 'normal');
  });
});

describe('push-notifications locale copy', () => {
  it('orderConfirmedContent returns FA and EN strings', () => {
    const fn = orderConfirmedContent('ORD-ABC123');
    assert.deepEqual(fn('en'), {
      title: 'Order confirmed',
      body: 'Order ORD-ABC123 is paid and being prepared.'
    });
    assert.match(fn('fa').title, /سفارش/);
    assert.match(fn('fa').body, /ORD-ABC123/);
  });

  it('orderStatusContent maps shipped status per locale', () => {
    const fn = orderStatusContent('ORD-1', 'shipped');
    assert.equal(fn('en').title, 'Order shipped');
    assert.match(fn('fa').title, /ارسال/);
  });

  it('orderStatusContent falls back to processing for unknown status', () => {
    const fn = orderStatusContent('ORD-1', 'unknown_status');
    assert.equal(fn('en').title, 'Order in progress');
  });

  it('abandonedBasketReminderContent returns EN and FA copy', () => {
    const fn = abandonedBasketReminderContent();
    assert.equal(fn('en').title, 'Your basket is waiting');
    assert.match(fn('fa').title, /سبد/);
  });
});
