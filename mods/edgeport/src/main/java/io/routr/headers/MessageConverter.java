/*
 * Copyright (C) 2024 by Fonoster Inc (https://fonoster.com)
 * http://github.com/fonoster/routr
 *
 * This file is part of Routr
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *    https://opensource.org/licenses/MIT
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package io.routr.headers;

import com.google.protobuf.Descriptors.FieldDescriptor;
import com.google.protobuf.GeneratedMessageV3;
import gov.nist.javax.sip.header.*;
import gov.nist.javax.sip.RequestEventExt;
import gov.nist.javax.sip.ResponseEventExt;
import io.routr.common.Transport;
import io.routr.message.ResponseType;
import io.routr.message.SIPMessage;
import io.routr.message.SIPMessage.Builder;
import io.routr.processor.MessageRequest;
import io.routr.processor.Method;
import io.routr.processor.NetInterface;
import io.routr.utils.ClassFinder;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import javax.sip.InvalidArgumentException;
import javax.sip.PeerUnavailableException;
import javax.sip.header.CallIdHeader;
import javax.sip.header.Header;
import javax.sip.header.ViaHeader;
import javax.sip.message.Message;
import javax.sip.message.Request;
import javax.sip.message.Response;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.ListIterator;

public class MessageConverter {
  private static final Logger LOG = LogManager.getLogger(MessageConverter.class);
  private final String edgePortRef;
  private List<NetInterface> listeningPoints;
  private List<String> externalAddrs;
  private List<String> localnets;

  public MessageConverter(String edgePortRef) {
    this.edgePortRef = edgePortRef;
  }

  public static SIPMessage convertToMessageDTO(final Message message) {
    Builder sipMessageBuilder = SIPMessage.newBuilder();

    if (message instanceof Request) {
      var sipURI = (javax.sip.address.SipURI) ((Request) message).getRequestURI();
      var converter = new SipURIConverter();
      sipMessageBuilder.setRequestUri(converter.fromObject(sipURI));
    } else if (message instanceof Response) {
      Response response = (Response) message;
      sipMessageBuilder.setResponseType(
        ResponseType.valueOf(ResponseCode.fromCode(response.getStatusCode())));
      sipMessageBuilder.setReasonPhrase(response.getReasonPhrase());
    }

    if(message.getContent() != null) {
      sipMessageBuilder.setBody(new String(message.getRawContent()));
    }

    // Getting a list of names of all headers present on SIP Message
    ListIterator<String> namesIterator = (ListIterator<String>) message.getHeaderNames();

    // Traversing elements
    while (namesIterator.hasNext()) {
      Header header = message.getHeader(namesIterator.next());
      String fieldName = header.getName().toLowerCase().replace("-", "_");
      Converter<Header, GeneratedMessageV3> converter = (Converter<Header, GeneratedMessageV3>) getConverterByHeader(header.getClass());
      ProtoMapping mapping = converter.getClass().getAnnotation(ProtoMapping.class);
      FieldDescriptor descriptor = SIPMessage.getDescriptor().findFieldByName(fieldName);

      // Takes care of headers that might appear more than once
      if (mapping.repeatable()) {
        ListIterator<Header> headers = (ListIterator<Header>) message.getHeaders(header.getName());
        while (headers.hasNext()) {
          Header currentHeader = headers.next();
          sipMessageBuilder.addRepeatedField(descriptor, converter.fromHeader(currentHeader));
        }
        // Takes care of custom headers
      } else if (mapping.extension()) {
        FieldDescriptor extDescriptor = SIPMessage.getDescriptor().findFieldByName(mapping.field());
        sipMessageBuilder.addRepeatedField(extDescriptor, converter.fromHeader(header));
        // Everything else goes here
      } else {
        sipMessageBuilder.setField(descriptor, converter.fromHeader(header));
      }
    }
    return sipMessageBuilder.build();
  }

  public static List<Header> createHeadersFromMessage(final SIPMessage message)
    throws InvalidArgumentException, PeerUnavailableException, ParseException {
    List<Header> headers = new ArrayList<>();

    try {
      var vias = message.getViaList().listIterator(message.getViaList().size());
      var routes = message.getRouteList().listIterator(message.getRouteList().size());
      var recordRoutes = message.getRecordRouteList().listIterator(message.getRecordRouteList().size());

      while (vias.hasPrevious()) {
        io.routr.message.Via via = vias.previous();
        var converter = getConverterByHeader(Via.class);
        headers.add(converter.fromDTO(via));
      }

      while (routes.hasPrevious()) {
        io.routr.message.Route route = routes.previous();
        var converter = getConverterByHeader(Route.class);
        headers.add(converter.fromDTO(route));
      }

      while (recordRoutes.hasPrevious()) {
        io.routr.message.RecordRoute recordRoute = recordRoutes.previous();
        var converter = getConverterByHeader(RecordRoute.class);
        headers.add(converter.fromDTO(recordRoute));
      }

      if (message.hasMaxForwards()) {
        var converter = getConverterByHeader(MaxForwards.class);
        headers.add(converter.fromDTO(message.getMaxForwards()));
      }

      if (message.hasCallId()) {
        var converter = getConverterByHeader(CallID.class);
        headers.add(converter.fromDTO(message.getCallId()));
      }

      if (message.hasWwwAuthenticate()) {
        var converter = getConverterByHeader(WWWAuthenticate.class);
        headers.add(converter.fromDTO(message.getWwwAuthenticate()));
      }

      if (message.hasAuthorization()) {
        var converter = getConverterByHeader(Authorization.class);
        headers.add(converter.fromDTO(message.getAuthorization()));
      }

      if (message.hasFrom()) {
        var converter = getConverterByHeader(From.class);
        headers.add(converter.fromDTO(message.getFrom()));
      }

      if (message.hasTo()) {
        var converter = getConverterByHeader(To.class);
        headers.add(converter.fromDTO(message.getTo()));
      }

      if (message.hasContact()) {
        var converter = getConverterByHeader(Contact.class);
        headers.add(converter.fromDTO(message.getContact()));
      }

      if (message.hasExpires()) {
        var converter = getConverterByHeader(Expires.class);
        headers.add(converter.fromDTO(message.getExpires()));
      }

      if (!message.getExtensionsList().isEmpty()) {
        var extensions = message.getExtensionsList().iterator();
        var converter = new ExtensionConverter();

        while (extensions.hasNext()) {
          io.routr.message.Extension extension = extensions.next();
          try {
            headers.add(converter.fromDTO(extension));
          } catch (Exception e) {
            LOG.error("an exception occurred while processing extension list", e);
          }
        }
      }
    } catch (Exception e) {
      LOG.error("an exception occurred while creating headers for message", e);
    }
    return headers;
  }

  private static NetInterface buildNetInterface(String ipAddress, int port, ViaHeader via) {
    return NetInterface.newBuilder()
      .setHost(ipAddress)
      .setPort(port)
      .setTransport(Transport.valueOf(via.getTransport().toUpperCase()))
      .build();
  }

  private static NetInterface getSenderFromRequest(final RequestEventExt event) {
    if (event == null) {
      return NetInterface.newBuilder().build();
    }

    Request request = event.getRequest();
    ViaHeader via = (ViaHeader) request.getHeader(ViaHeader.NAME);
    return MessageConverter.getSenderFromVia(via);
  }

  private static NetInterface getSenderFromResponse(final ResponseEventExt event) {
    Response response = event.getResponse();
    ViaHeader via = (ViaHeader) response.getHeader(ViaHeader.NAME);
    return buildNetInterface(event.getRemoteIpAddress(), event.getRemotePort(), via);
  }

  private static NetInterface getSenderFromVia(final ViaHeader via) {
    if (via == null) {
      return NetInterface.newBuilder().build();
    }

    return NetInterface.newBuilder()
      .setHost(via.getHost())
      .setPort(via.getPort())
      .setTransport(Transport.valueOf(via.getTransport().toUpperCase()))
      .build();
  }

  private static Converter getConverterByHeader(Class<?> clasz) {
    Class<Converter> converter = ClassFinder.findConverterByHeaderClass(clasz);
    if (converter != null) {
      try {
        return converter.getDeclaredConstructor().newInstance();
      } catch (Exception e) {
        LOG.error("an exception occurred while getting converter for clasz: {}", clasz.toString(), e);
      }
    }
    return new ExtensionConverter();
  }

  public MessageRequest createMessageRequest(final Message message, final RequestEventExt requestEvent, 
    final ResponseEventExt responseEvent) {
    String methodStr = null;
    if (message instanceof Request) {
      methodStr = ((Request) message).getMethod();
    } else {
      methodStr = ((CSeq) (message).getHeader(CSeq.NAME)).getMethod();
    }

    NetInterface sender = NetInterface.newBuilder().build();

    if (requestEvent != null) {
      sender = getSenderFromRequest(requestEvent);
    } else if (responseEvent != null) {
      sender = getSenderFromResponse(responseEvent);
    }

    String callId = ((CallIdHeader) message.getHeader(CallIdHeader.NAME)).getCallId();
    assert methodStr != null;
    Method method = Method.valueOf(methodStr.toUpperCase());

    return MessageRequest
      .newBuilder()
      .setRef(callId)
      .setEdgePortRef(this.edgePortRef)
      .setMethod(method)
      .setSender(sender)
      .addAllListeningPoints(this.listeningPoints)
      .addAllExternalAddrs(this.externalAddrs)
      .addAllLocalnets(this.localnets)
      .setMessage(convertToMessageDTO(message))
      .build();
  }

  public void setListeningPoints(final List<NetInterface> listeningPoints) {
    this.listeningPoints = listeningPoints;
  }

  public void setExternalAddrs(final List<String> externalAddrs) {
    this.externalAddrs = externalAddrs;
  }

  public void setLocalnets(final List<String> localnets) {
    this.localnets = localnets;
  }
}