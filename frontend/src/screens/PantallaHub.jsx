import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, SafeAreaView } from 'react-native';
import { useContextoAplicacion } from '../context/ContextoAplicacion';
import { servicioConexion } from '../services/conexionServidor';
import { servicioAlmacenamientoLocal } from '../services/almacenamientoLocal';
import {
  sincronizarSenalesPendientes,
  registrarSenalLocal,
  encolarSenalOffline,
} from '../services/sincronizacionOffline';
import BarraUsuario from '../components/BarraUsuario';
import IndicadorConexion from '../components/IndicadorConexion';
import TarjetaGrupo from '../components/TarjetaGrupo';
import HistorialPeticiones from '../components/HistorialPeticiones';
import BotonAccion from '../components/BotonAccion';
import ModalCambiarGrupo from '../components/ModalCambiarGrupo';
import AvisoToast from '../components/AvisoToast';

const PantallaHub = ({ navigation }) => {
  const {
    usuario,
    idSesion,
    idGrupo,
    actualizarEstadoConexion,
    actualizarMiembrosGrupo,
    agregarPeticion,
    establecerHistorial,
    establecerUsuario,
    limpiarSesion,
    setWsListo,
    URL_SERVIDOR,
  } = useContextoAplicacion();

  const [modalGrupoVisible, setModalGrupoVisible] = useState(false);
  const [cambiandoGrupo, setCambiandoGrupo] = useState(false);
  const [aviso, setAviso] = useState(null);

  const historialCargado = useRef(false);
  const callbacksRef = useRef({});
  const sincronizarEstadoRef = useRef(null);
  const manejarSesionInvalidaRef = useRef(null);
  const urlServidorRef = useRef(URL_SERVIDOR);
  const miembrosPreviosRef = useRef([]);
  const presenciaInicialRef = useRef(true);

  urlServidorRef.current = URL_SERVIDOR;

  const mostrarAviso = useCallback((mensaje, tipo) => {
    setAviso({ id: `${Date.now()}-${Math.random()}`, mensaje, tipo });
  }, []);

  const sincronizarEstadoVisual = useCallback(() => {
    const estadoReal = servicioConexion.obtenerEstadoReal();
    const listo = servicioConexion.estaConectado();
    setWsListo(listo);

    if (estadoReal === 'conectado') {
      actualizarEstadoConexion('conectado', 100);
    } else if (estadoReal === 'reconectando') {
      actualizarEstadoConexion('reconectando', 50);
    } else {
      actualizarEstadoConexion('desconectado', 0);
    }
  }, [actualizarEstadoConexion, setWsListo]);

  sincronizarEstadoRef.current = sincronizarEstadoVisual;

  const manejarRefrescar = useCallback(async () => {
    try {
      const miembros = await servicioConexion.obtenerMiembrosGrupo(idGrupo);
      actualizarMiembrosGrupo(miembros);
    } catch (error) {
      console.error('Error al refrescar miembros:', error);
    }
  }, [idGrupo, actualizarMiembrosGrupo]);

  const manejarSesionInvalida = useCallback(
    async (mensaje) => {
      servicioConexion.desconectarWebSocket(true);
      await servicioAlmacenamientoLocal.limpiarTodo();
      limpiarSesion();
      Alert.alert('Sesion expirada', mensaje, [
        { text: 'Ingresar de nuevo', onPress: () => navigation.replace('Autenticacion') },
      ]);
    },
    [limpiarSesion, navigation]
  );

  manejarSesionInvalidaRef.current = manejarSesionInvalida;

  const manejarCerrarSesion = useCallback(async () => {
    Alert.alert(
      'Cerrar Sesion',
      'Estas seguro de que deseas cerrar sesion?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesion',
          style: 'destructive',
          onPress: async () => {
            try {
              servicioConexion.desconectarWebSocket(true);
              if (idSesion) {
                await servicioConexion.eliminarSesion(idSesion);
              }
              await servicioAlmacenamientoLocal.limpiarTodo();
              limpiarSesion();
              navigation.replace('Autenticacion');
            } catch (error) {
              console.error('Error al cerrar sesion:', error);
              limpiarSesion();
              navigation.replace('Autenticacion');
            }
          },
        },
      ]
    );
  }, [idSesion, limpiarSesion, navigation]);

  const manejarCambiarGrupo = useCallback(
    async (nuevoGrupo) => {
      if (!nuevoGrupo || nuevoGrupo.id === idGrupo) {
        setModalGrupoVisible(false);
        return;
      }

      setCambiandoGrupo(true);
      const idSesionAnterior = idSesion;

      try {
        // Con unicidad GLOBAL de nombre, primero hay que LIBERAR el nombre (cerrar la sesion
        // anterior) y luego recrearlo en el nuevo grupo; si no, el servidor lo veria duplicado.
        servicioConexion.desconectarWebSocket(true);
        if (idSesionAnterior) {
          await servicioConexion.eliminarSesion(idSesionAnterior);
        }

        const nuevaSesion = await servicioConexion.crearSesion(usuario, nuevoGrupo.id);

        const datos = {
          nombre: usuario,
          idSesion: nuevaSesion.session_id,
          idGrupo: nuevoGrupo.id,
          nombreGrupo: nuevoGrupo.nombre,
        };

        await servicioAlmacenamientoLocal.guardarUsuario(datos);
        await servicioAlmacenamientoLocal.guardarSesion(nuevaSesion);

        // Limpiar la vista del grupo anterior y recargar el historial del nuevo.
        historialCargado.current = false;
        actualizarMiembrosGrupo([]);
        establecerHistorial([]);

        // Actualizar el contexto: dispara el efecto que reconecta el WebSocket al nuevo grupo.
        establecerUsuario(datos);

        setModalGrupoVisible(false);
      } catch (error) {
        setModalGrupoVisible(false);
        Alert.alert(
          'No se pudo cambiar de grupo',
          'Ocurrio un problema al cambiarte. Vuelve a ingresar con tu nombre.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await servicioAlmacenamientoLocal.limpiarTodo();
                limpiarSesion();
                navigation.replace('Autenticacion');
              },
            },
          ]
        );
      } finally {
        setCambiandoGrupo(false);
      }
    },
    [idGrupo, idSesion, usuario, establecerUsuario, actualizarMiembrosGrupo, establecerHistorial, limpiarSesion, navigation]
  );

  const manejarEnviarSenal = useCallback(
    async (idEvento, timestamp) => {
      const listo = await servicioConexion.asegurarConexion(8000);
      sincronizarEstadoRef.current?.();

      if (!listo) {
        await encolarSenalOffline(idGrupo, idEvento, timestamp, usuario);
        await registrarSenalLocal(usuario, idGrupo, idEvento, timestamp, agregarPeticion);
        Alert.alert(
          'Modo offline',
          'No hay canal en tiempo real. La senal quedo guardada para sincronizar.'
        );
        return;
      }

      try {
        const respuesta = await servicioConexion.enviarSenal(idEvento, timestamp);
        if (respuesta.status === 'success' || respuesta.status === 'duplicate') {
          await registrarSenalLocal(usuario, idGrupo, idEvento, timestamp, agregarPeticion);
        }
      } catch (error) {
        console.error('Error al enviar senal:', error);
        sincronizarEstadoRef.current?.();

        if (error.message.includes('conectado') || error.message.includes('Timeout')) {
          await encolarSenalOffline(idGrupo, idEvento, timestamp, usuario);
          await registrarSenalLocal(usuario, idGrupo, idEvento, timestamp, agregarPeticion);
          Alert.alert(
            'Sin conexion',
            'La senal se guardo y se enviara cuando recuperes la conexion.'
          );
        } else {
          Alert.alert('Error', 'No se pudo enviar la senal. Intenta nuevamente.');
        }
      }
    },
    [usuario, idGrupo, agregarPeticion]
  );

  useEffect(() => {
    callbacksRef.current = {
      onConectado: async () => {
        sincronizarEstadoRef.current?.();
        if (!servicioConexion.estaConectado()) {
          return;
        }
        const sincronizadas = await sincronizarSenalesPendientes(usuario, agregarPeticion);
        if (sincronizadas > 0) {
          Alert.alert(
            'Sincronizado',
            `${sincronizadas} senal(es) pendiente(s) enviada(s) al grupo.`
          );
        }
        if (servicioConexion.estaConectado()) {
          manejarRefrescar();
        }
        sincronizarEstadoRef.current?.();
      },
      onDesconectado: () => sincronizarEstadoRef.current?.(),
      onErrorConexion: () => sincronizarEstadoRef.current?.(),
      onReconectando: (intentos) => {
        setWsListo(false);
        actualizarEstadoConexion('reconectando', Math.max(20, 100 - intentos * 15));
      },
      onReconexionFallida: () => {
        sincronizarEstadoRef.current?.();
        Alert.alert(
          'Canal en tiempo real no disponible',
          `REST OK pero WebSocket no conecta.\n\nBFF: ${urlServidorRef.current}\nWS: ${servicioConexion.obtenerUltimaUrlWs()}\n\nRevisa .env (EXPO_PUBLIC_BFF_HOST), usa "npx expo start --lan" y reinicia Expo Go.`
        );
      },
      onSesionInvalida: (mensaje) => manejarSesionInvalida(mensaje),
      onPresencia: (datos) => {
        if (!datos.data || !Array.isArray(datos.data.names)) {
          return;
        }
        const nuevos = datos.data.names;
        actualizarMiembrosGrupo(nuevos);

        // El primer 'presence' tras (re)conectar es la foto inicial: fija la base sin avisar.
        if (presenciaInicialRef.current) {
          presenciaInicialRef.current = false;
          miembrosPreviosRef.current = nuevos;
          return;
        }

        const previos = miembrosPreviosRef.current;
        const entraron = nuevos.filter((n) => !previos.includes(n) && n !== usuario);
        const salieron = previos.filter((n) => !nuevos.includes(n) && n !== usuario);
        miembrosPreviosRef.current = nuevos;

        entraron.forEach((n) => mostrarAviso(`${n} se unió al grupo`, 'entrada'));
        salieron.forEach((n) => mostrarAviso(`${n} salió del grupo`, 'salida'));
      },
      onNotificacion: (datos) => {
        if (datos.data) {
          const peticion = {
            remitente: datos.data.sender_name,
            mensaje: datos.data.message,
            timestamp: datos.data.timestamp,
          };
          agregarPeticion(peticion);
          servicioAlmacenamientoLocal.agregarPeticionHistorial(peticion, idGrupo);
        }
      },
      onError: (datos) => {
        Alert.alert('Error del servidor', datos.message || 'Ocurrio un error en el servidor');
      },
    };
  });

  useEffect(() => {
    if (!idSesion || !idGrupo || !usuario) {
      return undefined;
    }

    let activo = true;

    // Nueva conexión/grupo: la próxima lista de miembros es la base (no dispara avisos).
    presenciaInicialRef.current = true;
    miembrosPreviosRef.current = [];

    const enlazarCallbacks = () => ({
      onConectado: () => callbacksRef.current.onConectado?.(),
      onDesconectado: (razon) => callbacksRef.current.onDesconectado?.(razon),
      onErrorConexion: (err) => callbacksRef.current.onErrorConexion?.(err),
      onReconectando: (n) => callbacksRef.current.onReconectando?.(n),
      onReconexionFallida: () => callbacksRef.current.onReconexionFallida?.(),
      onSesionInvalida: (m) => callbacksRef.current.onSesionInvalida?.(m),
      onPresencia: (d) => callbacksRef.current.onPresencia?.(d),
      onNotificacion: (d) => callbacksRef.current.onNotificacion?.(d),
      onError: (d) => callbacksRef.current.onError?.(d),
    });

    const conectar = async () => {
      servicioConexion.establecerURL(URL_SERVIDOR);

      const sesionValida = await servicioConexion.verificarSesionActiva(idSesion);
      if (!activo) {
        return;
      }

      if (!sesionValida) {
        await manejarSesionInvalidaRef.current?.('La sesion expiro. Vuelve a ingresar.');
        return;
      }

      if (!activo) {
        return;
      }

      servicioConexion.iniciarConexionWebSocket(
        idSesion,
        idGrupo,
        usuario,
        enlazarCallbacks()
      );
    };

    conectar();

    if (!historialCargado.current) {
      historialCargado.current = true;
      servicioAlmacenamientoLocal.obtenerHistorial(idGrupo).then((historial) => {
        if (activo) {
          establecerHistorial(historial);
        }
      });
    }

    const intervaloEstado = setInterval(() => {
      sincronizarEstadoRef.current?.();
    }, 3000);

    return () => {
      activo = false;
      clearInterval(intervaloEstado);
      servicioConexion.desconectarWebSocket(true);
      setWsListo(false);
    };
  }, [idSesion, idGrupo, usuario, URL_SERVIDOR]);

  return (
    <SafeAreaView style={estilos.contenedorSeguro}>
      <AvisoToast aviso={aviso} onOcultar={() => setAviso(null)} />
      <View style={estilos.contenedor}>
        <BarraUsuario
          onCerrarSesion={manejarCerrarSesion}
          onCambiarGrupo={() => setModalGrupoVisible(true)}
        />
        <IndicadorConexion />
        <ScrollView style={estilos.contenido} showsVerticalScrollIndicator={false}>
          <TarjetaGrupo />
          <HistorialPeticiones onRefrescar={manejarRefrescar} />
        </ScrollView>
        <BotonAccion onEnviarSenal={manejarEnviarSenal} />
      </View>

      <ModalCambiarGrupo
        visible={modalGrupoVisible}
        grupoActual={idGrupo}
        cambiando={cambiandoGrupo}
        onSeleccionar={manejarCambiarGrupo}
        onCerrar={() => setModalGrupoVisible(false)}
      />
    </SafeAreaView>
  );
};

const estilos = StyleSheet.create({
  contenedorSeguro: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  contenedor: {
    flex: 1,
  },
  contenido: {
    flex: 1,
  },
});

export default PantallaHub;
