import { SharedSpaceClient } from '@/components/shared/SharedSpaceClient';

interface SharedSpacePageProps {
  params: Promise<{
    spaceId: string;
  }>;
}

export default async function SharedSpacePage({ params }: SharedSpacePageProps) {
  const { spaceId } = await params;
  return <SharedSpaceClient spaceId={spaceId} />;
}
