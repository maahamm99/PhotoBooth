import { useEffect, useRef, useState } from "react";

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

// Small mesh of RTCPeerConnections, one per remote participant, signaled over
// the existing socket.io room channel. Whoever has the "smaller" socket id
// initiates the offer, so both sides agree on a direction without extra chatter.
export function useWebRTC(socket, selfId, peerIds, localStream) {
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const peersRef = useRef(new Map());

  function closePeer(id) {
    const pc = peersRef.current.get(id);
    if (pc) {
      pc.close();
      peersRef.current.delete(id);
    }
    setRemoteStreams((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  function ensurePeer(id, initiator) {
    if (peersRef.current.has(id) || !localStream) return peersRef.current.get(id);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc:signal", { to: id, data: { candidate: event.candidate } });
      }
    };
    pc.ontrack = (event) => {
      setRemoteStreams((prev) => new Map(prev).set(id, event.streams[0]));
    };

    peersRef.current.set(id, pc);

    if (initiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => socket.emit("webrtc:signal", { to: id, data: { sdp: pc.localDescription } }))
        .catch(() => {});
    }
    return pc;
  }

  useEffect(() => {
    if (!localStream || !selfId) return;
    const wanted = new Set(peerIds.filter((id) => id !== selfId));

    for (const id of wanted) {
      ensurePeer(id, selfId < id);
    }
    for (const id of Array.from(peersRef.current.keys())) {
      if (!wanted.has(id)) closePeer(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerIds.join(","), selfId, localStream]);

  useEffect(() => {
    async function onSignal({ from, data }) {
      let pc = peersRef.current.get(from) || ensurePeer(from, false);
      if (!pc) return;
      try {
        if (data.sdp) {
          await pc.setRemoteDescription(data.sdp);
          if (data.sdp.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("webrtc:signal", { to: from, data: { sdp: pc.localDescription } });
          }
        } else if (data.candidate) {
          await pc.addIceCandidate(data.candidate);
        }
      } catch {
        // Ignore stray/late signals from a peer connection that already closed.
      }
    }

    function onPeerLeft(id) {
      closePeer(id);
    }

    socket.on("webrtc:signal", onSignal);
    socket.on("webrtc:peer-left", onPeerLeft);
    return () => {
      socket.off("webrtc:signal", onSignal);
      socket.off("webrtc:peer-left", onPeerLeft);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, localStream]);

  useEffect(() => {
    return () => {
      for (const id of Array.from(peersRef.current.keys())) closePeer(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return remoteStreams;
}
