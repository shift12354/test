import { relativeTime, sourceLabel, type Dashboard } from '@life/shared';
import { View } from 'react-native';
import { Badge, Card, Empty, openUrl, Row, T } from '../ui';

export function InboxScreen({ d }: { d: Dashboard }) {
  return (
    <>
      <Card title="Innboks" count={d.mail.filter((m) => m.unread).length}>
        {d.mail.length === 0 ? <Empty>Ingen mail</Empty> : d.mail.map((m, i) => (
          <Row key={m.id} onPress={() => openUrl(m.url)} last={i === d.mail.length - 1}>
            <View style={{ flex: 1, gap: 2 }}>
              <T small bold>{m.from.name || m.from.address} · {sourceLabel[m.source]}</T>
              <T bold={m.unread} muted={!m.unread} lines={2}>{m.subject}</T>
              {m.reasons?.length ? <T muted small lines={1}>{m.reasons.join(' · ')}</T> : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              {m.priority && m.priority !== 'low' ? <Badge p={m.priority} /> : null}
              <T muted small>{relativeTime(m.receivedAt)}</T>
            </View>
          </Row>
        ))}
      </Card>
      <Card title="Meldinger" count={d.messages.filter((m) => m.unread).length}>
        {d.messages.length === 0 ? <Empty>Ingen nye meldinger</Empty> : d.messages.map((m, i) => (
          <Row key={m.id} onPress={() => openUrl(m.url)} last={i === d.messages.length - 1}>
            <View style={{ flex: 1, gap: 2 }}>
              <T small bold>{m.from} i {m.channel} · {sourceLabel[m.source]}</T>
              <T lines={2}>{m.text}</T>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              {m.mentionsMe ? <Badge p="high" label="@deg" /> : null}
              <T muted small>{relativeTime(m.sentAt)}</T>
            </View>
          </Row>
        ))}
      </Card>
    </>
  );
}
