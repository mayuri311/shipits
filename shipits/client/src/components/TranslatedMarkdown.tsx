import React from 'react';
import { TranslatedContent } from '@/components/TranslatedContent';

type Props = React.ComponentProps<typeof TranslatedContent>;

export function TranslatedMarkdown(props: Props) {
  return <TranslatedContent {...props} />;
}

export default TranslatedMarkdown;

