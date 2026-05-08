import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from '@react-email/components'
import {
  LOGO_URL,
  button,
  container,
  footer,
  h1,
  link,
  logo,
  logoWrap,
  main,
  text,
} from './_shared'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Du wurdest zu {siteName} eingeladen</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoWrap}>
          <Img src={LOGO_URL} alt={siteName} style={logo} />
        </div>
        <Heading style={h1}>Du wurdest eingeladen</Heading>
        <Text style={text}>
          Du wurdest eingeladen,{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>{' '}
          beizutreten. Klicke auf den Button, um die Einladung anzunehmen und
          dein Konto zu erstellen.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Einladung annehmen
        </Button>
        <Text style={footer}>
          Falls du diese Einladung nicht erwartet hast, kannst du diese E-Mail
          ignorieren.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
