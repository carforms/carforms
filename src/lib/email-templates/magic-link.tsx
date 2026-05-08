import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from '@react-email/components'
import {
  LOGO_URL,
  button,
  container,
  footer,
  h1,
  logo,
  logoWrap,
  main,
  text,
} from './_shared'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Dein Login-Link für {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoWrap}>
          <Img src={LOGO_URL} alt={siteName} style={logo} />
        </div>
        <Heading style={h1}>Dein Login-Link</Heading>
        <Text style={text}>
          Klicke auf den Button, um dich bei {siteName} anzumelden. Der Link
          läuft in Kürze ab.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Anmelden
        </Button>
        <Text style={footer}>
          Falls du diesen Link nicht angefordert hast, kannst du diese E-Mail
          ignorieren.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
