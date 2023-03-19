import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SiteStack, liveProps } from '../src/main';

test('Snapshot', () => {
  const app = new App();
  const stack = new SiteStack(app, 'test', {
    ...liveProps,
  });

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});