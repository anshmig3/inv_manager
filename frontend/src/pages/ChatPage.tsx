import ChatInterface from '../components/Chat/ChatInterface';

interface Props {
  initialMessage?: string;
}

export default function ChatPage({ initialMessage }: Props) {
  return (
    <div className="h-[calc(100vh-130px)]">
      <ChatInterface initialMessage={initialMessage} />
    </div>
  );
}
