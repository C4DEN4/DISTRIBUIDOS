import React, { useEffect, useCallback, useRef } from 'react';
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

const PantallaHub = ({ navigation }) => {
  const {
    usuario,
    idSesion,
    idGrupo,
    actualizarEstadoConexion,
    actualizarMiembrosGrupo,
    agregarPeticion,
    establecerHistorial,
    limpiarSesion,
    setWsListo,
    URL_SERVIDOR,
    establecerUsuario,
  } = useContextoAplicacion();

  const historialCargado = useRef(false);
  const callbacksRef = useRef({});
  const sincronizarEstadoRef = useRef(null);
  const manejarSesionInvalidaRef = useRef(null);
  const urlServidorRef = useRef(URL_SERVIDOR);
  const estabaDesconectadoRef = useRef(false);
  const reconexionEnProgresoRef = useRef(false);

  urlServidorRef.current = URL_SERVIDOR;

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
      // No mostrar el error al usuario
    }
  }, [idGrupo, actualizarMiembrosGrupo]);

  const manejarSesionInvalida = useCallback(
    async (mensaje) => {
      servicioConexion.desconectarWebSocket(true);
      await servicioAlmacenamientoLocal.limpiarTodo();
      limpiarSesion();
      Alert.alert('Sesión expirada', mensaje, [
        { text: 'Ingresar de nuevo', onPress: () => navigation.replace('Autenticacion') },
      ]);
    },
    [limpiarSesion, navigation]
  );

  manejarSesionInvalidaRef.current = manejarSesionInvalida;

  const manejarCerrarSesion = useCallback(async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
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
              limpiarSesion();
              navigation.replace('Autenticacion');
            }
          },
        },
      ]
    );
  }, [idSesion, limpiarSesion, navigation]);

  const manejarSalirGrupo = useCallback(async () => {
    Alert.alert(
      'Salir del Grupo',
      '¿Estás seguro de que deseas salir del grupo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            try {
              servicioConexion.desconectarWebSocket(true);
              if (idSesion) {
                await servicioConexion.eliminarSesion(idSesion);
              }
              await servicioAlmacenamientoLocal.guardarUsuario({
                nombre: usuario,
                idSesion: null,
                idGrupo: null,
                nombreGrupo: null,
              });
              limpiarSesion();
              establecerUsuario({
                nombre: usuario,
                idSesion: null,
                idGrupo: null,
                nombreGrupo: null,
              });
              navigation.replace('SeleccionGrupo');
            } catch (error) {
              limpiarSesion();
              navigation.replace('SeleccionGrupo');
            }
          },
        },
      ]
    );
  }, [idSesion, usuario, limpiarSesion, navigation, establecerUsuario]);

  const manejarEnviarSenal = useCallback(
    async (idEvento, timestamp) => {
      const listo = await servicioConexion.asegurarConexion(8000);
      sincronizarEstadoRef.current?.();

      if (!listo) {
        await encolarSenalOffline(idGrupo, idEvento, timestamp, usuario);
        await registrarSenalLocal(usuario, idGrupo, idEvento, timestamp, agregarPeticion);
        Alert.alert(
          'Modo offline',
          'No hay canal en tiempo real. La señal quedó guardada para sincronizar.'
        );
        return;
      }

      try {
        const respuesta = await servicioConexion.enviarSenal(idEvento, timestamp);
        if (respuesta.status === 'success' || respuesta.status === 'duplicate') {
          await registrarSenalLocal(usuario, idGrupo, idEvento, timestamp, agregarPeticion);
        }
      } catch (error) {
        sincronizarEstadoRef.current?.();

        if (error.message.includes('conectado') || error.message.includes('Timeout')) {
          await encolarSenalOffline(idGrupo, idEvento, timestamp, usuario);
          await registrarSenalLocal(usuario, idGrupo, idEvento, timestamp, agregarPeticion);
          Alert.alert(
            'Sin conexión',
            'La señal se guardó y se enviará cuando recuperes la conexión.'
          );
        } else {
          Alert.alert('Error', 'No se pudo enviar la señal. Por favor intenta nuevamente.');
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
            `${sincronizadas} señal(es) pendiente(s) enviada(s) al grupo.`
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
          'No se pudo establecer la conexión en tiempo real. Verifica tu conexión a internet y vuelve a intentar.'
        );
      },
      onSesionInvalida: (mensaje) => manejarSesionInvalida(mensaje),
      onAck: async (datos) => {
        if (datos.event_id && datos.status === 'success') {
          try {
            const url = `${URL_SERVIDOR}/api/v1/groups/${idGrupo}/events/${datos.event_id}`;
            const respuesta = await fetch(url);
            if (respuesta.ok) {
              const evento = await respuesta.json();
              if (evento.sender_name && evento.message) {
                const peticion = {
                  remitente: evento.sender_name,
                  mensaje: evento.message,
                  timestamp: evento.timestamp || Date.now(),
                };
                agregarPeticion(peticion);
                servicioAlmacenamientoLocal.agregarPeticionHistorial(peticion, idGrupo);
              }
            }
          } catch (error) {
            // No mostrar el error al usuario
          }
        }
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
        Alert.alert('Error del servidor', datos.message || 'Ocurrió un error en el servidor');
      },
    };
  });

  useEffect(() => {
    if (!idSesion || !idGrupo || !usuario) {
      return undefined;
    }

    let activo = true;

    const enlazarCallbacks = () => ({
      onConectado: () => callbacksRef.current.onConectado?.(),
      onDesconectado: (razon) => callbacksRef.current.onDesconectado?.(razon),
      onErrorConexion: (err) => callbacksRef.current.onErrorConexion?.(err),
      onReconectando: (n) => callbacksRef.current.onReconectando?.(n),
      onReconexionFallida: () => callbacksRef.current.onReconexionFallida?.(),
      onSesionInvalida: (m) => callbacksRef.current.onSesionInvalida?.(m),
      onAck: (d) => callbacksRef.current.onAck?.(d),
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

      const estaConectado = servicioConexion.estaConectado();

      // Actualizar miembros inmediatamente cuando se reconecta
      if (activo && estaConectado && estabaDesconectadoRef.current) {
        estabaDesconectadoRef.current = false;
        // Esperar un momento para que el servidor actualice el estado de las conexiones
        setTimeout(() => {
          if (activo) {
            try {
              manejarRefrescar();
            } catch (error) {
              // No mostrar el error al usuario
            }
          }
        }, 1000);
      }
    }, 3000);

    const intervaloMiembros = setInterval(() => {
      if (activo && servicioConexion.estaConectado()) {
        try {
          manejarRefrescar();
        } catch (error) {
          // No mostrar el error al usuario
        }
      }
    }, 20000);

    return () => {
      activo = false;
      clearInterval(intervaloEstado);
      clearInterval(intervaloMiembros);
      servicioConexion.desconectarWebSocket(true);
      setWsListo(false);
    };
  }, [idSesion, idGrupo, usuario, URL_SERVIDOR]);

  return (
    <SafeAreaView style={estilos.contenedorSeguro}>
      <View style={estilos.contenedor}>
        <BarraUsuario />
        <IndicadorConexion />
        <ScrollView style={estilos.contenido} showsVerticalScrollIndicator={false}>
          <TarjetaGrupo onSalirGrupo={manejarSalirGrupo} />
          <HistorialPeticiones onRefrescar={manejarRefrescar} />
        </ScrollView>
        <BotonAccion onEnviarSenal={manejarEnviarSenal} />
      </View>
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
