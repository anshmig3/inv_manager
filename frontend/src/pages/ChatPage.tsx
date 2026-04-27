import ChatInterface from '../components/Chat/ChatInterface';

interface Props {
  initialMessage?: string;
  onNavigate?: (action: string) => void;
}

export default function ChatPage({ initialMessage, onNavigate }: Props) {
  return (
    <div className="h-[calc(100vh-130px)]">
      <ChatInterface initialMessage={initialMessage} onNavigate={onNavigate} />
    </div>
  );
}
